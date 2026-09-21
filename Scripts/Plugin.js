const PluginRegistry = new Map();
const WidgetMap = new Map();
const EventHandlers = new Map();

let WidgetZ = 50;
let ApiReady = false;

function Emit(Event, Payload) {
    const List = EventHandlers.get(Event);
    if (!List) return;
    for (const Fn of List) {
        try { Fn(Payload); } catch (E) { console.error(`[plugin:${Event}]`, E); }
    }
}

function On(Event, Fn) {
    if (!EventHandlers.has(Event)) EventHandlers.set(Event, []);
    EventHandlers.get(Event).push(Fn);
    return () => {
        const L = EventHandlers.get(Event);
        if (!L) return;
        const I = L.indexOf(Fn);
        if (I >= 0) L.splice(I, 1);
    };
}

function MakeDraggable(El, Handle) {
    let Dragging = false;
    let Ox = 0, Oy = 0;
    Handle.addEventListener("pointerdown", (E) => {
        if (E.button !== 0) return;
        if (E.target.closest("button, input, select, a")) return;
        Dragging = true;
        Ox = E.clientX - El.offsetLeft;
        Oy = E.clientY - El.offsetTop;
        El.style.zIndex = String(++WidgetZ);
        Handle.setPointerCapture?.(E.pointerId);
        E.preventDefault();
    });
    const Move = (E) => {
        if (!Dragging) return;
        const X = Math.max(0, Math.min(window.innerWidth - 80, E.clientX - Ox));
        const Y = Math.max(0, Math.min(window.innerHeight - 40, E.clientY - Oy));
        El.style.left = `${X}px`;
        El.style.top = `${Y}px`;
        El.style.right = "auto";
        El.style.bottom = "auto";
    };
    const Up = () => { Dragging = false; };
    window.addEventListener("pointermove", Move);
    window.addEventListener("pointerup", Up);
    window.addEventListener("pointercancel", Up);
}

function CreateWidget(Opts) {
    const Id = Opts.Id || `widget_${Date.now()}`;
    if (WidgetMap.has(Id)) {
        const Existing = WidgetMap.get(Id);
        Existing.style.zIndex = String(++WidgetZ);
        Existing.classList.remove("WidgetHidden");
        return Existing;
    }

    const El = document.createElement("div");
    El.className = "PluginWidget";
    El.dataset.widgetId = Id;
    El.style.left = `${Opts.X ?? 24}px`;
    El.style.top = `${Opts.Y ?? 120}px`;
    if (Opts.Width) El.style.width = typeof Opts.Width === "number" ? `${Opts.Width}px` : Opts.Width;
    if (Opts.Height) El.style.height = typeof Opts.Height === "number" ? `${Opts.Height}px` : Opts.Height;
    El.style.zIndex = String(++WidgetZ);

    const Title = document.createElement("div");
    Title.className = "WidgetTitle";
    Title.innerHTML = `<span class="WidgetTitleText"></span><div class="WidgetTitleBtns"></div>`;
    Title.querySelector(".WidgetTitleText").textContent = Opts.Title || Id;

    const CloseBtn = document.createElement("button");
    CloseBtn.className = "WidgetBtn";
    CloseBtn.title = "Close";
    CloseBtn.textContent = "×";
    CloseBtn.addEventListener("click", () => {
        if (Opts.OnClose) Opts.OnClose();
        El.classList.add("WidgetHidden");
    });
    Title.querySelector(".WidgetTitleBtns").appendChild(CloseBtn);

    const Body = document.createElement("div");
    Body.className = "WidgetBody";
    if (typeof Opts.Body === "string") Body.innerHTML = Opts.Body;
    else if (Opts.Body instanceof HTMLElement) Body.appendChild(Opts.Body);
    else if (typeof Opts.Build === "function") Opts.Build(Body);

    El.appendChild(Title);
    El.appendChild(Body);
    document.body.appendChild(El);
    MakeDraggable(El, Title);
    WidgetMap.set(Id, El);
    return El;
}

function DestroyWidget(Id) {
    const El = WidgetMap.get(Id);
    if (!El) return;
    El.remove();
    WidgetMap.delete(Id);
}

function GetSim() {
    return globalThis.CanvasRenderer || null;
}

function SpawnAtom(Key, Position, Velocity) {
    if (typeof globalThis.Atom !== "function") return null;
    return globalThis.Atom(Key, Position, Velocity || [0, 0, 0]);
}

function ForceBond(IndexA, IndexB) {
    const R = GetSim();
    if (!R || !R.ForcedBonds) return;
    const Lo = Math.min(IndexA, IndexB);
    const Hi = Math.max(IndexA, IndexB);
    R.ForcedBonds.add(`${Lo}_${Hi}`);
}

function ClearAllAtoms() {
    if (!globalThis.Objects) return;
    globalThis.Objects.length = 0;
    const R = GetSim();
    if (R) {
        R.ForcedBonds?.clear();
        R.ActiveBondPairs?.clear();
        R.BondData?.clear();
        R.SelectedObject = null;
        R.HoveredObject = null;
        R.Particles = [];
    }
}

function GetAtoms() {
    return globalThis.Objects || [];
}

function CreatePluginContext(Entry) {
    return {
        Id: Entry.Id,
        CreateWidget: (Opts) => CreateWidget({ ...Opts, Id: Opts.Id || `${Entry.Id}_widget` }),
        DestroyWidget,
        GetWidget: (Id) => WidgetMap.get(Id) || null,
        SpawnAtom,
        ForceBond,
        ClearAtoms: ClearAllAtoms,
        GetAtoms,
        GetRenderer: GetSim,
        On,
        Emit,
        SetTemperature(T) {
            const R = GetSim();
            if (R) R.Temperature = T;
        },
        SetFreeEnergy(E) {
            const R = GetSim();
            if (R) R.FreeEnergy = E;
        },
        Settle(Frames = 90) {
            const R = GetSim();
            if (R) R.SettleFrames = Frames;
        }
    };
}

function BuildPluginDock() {
    let Dock = document.getElementById("PluginDock");
    if (!Dock) {
        Dock = document.createElement("div");
        Dock.Id = "PluginDock";
        Dock.id = "PluginDock";
        Dock.className = "PluginDock";
        document.body.appendChild(Dock);
    }
    Dock.innerHTML = "";
    const Label = document.createElement("span");
    Label.className = "PluginDockLabel";
    Label.textContent = "Plugins";
    Dock.appendChild(Label);

    for (const Entry of PluginRegistry.values()) {
        const Btn = document.createElement("button");
        Btn.className = "PluginDockBtn";
        Btn.textContent = Entry.Name || Entry.Id;
        Btn.title = Entry.Description || Entry.Name || Entry.Id;
        Btn.addEventListener("click", () => {
            Emit("OpenPlugin", { Id: Entry.Id });
            if (typeof Entry.Open === "function") {
                try { Entry.Open(CreatePluginContext(Entry)); } catch (E) { console.error(E); }
            }
        });
        Dock.appendChild(Btn);
    }
}

const Plugin = {
    Register(Entry) {
        if (!Entry || !Entry.Id) {
            console.warn("Plugin must have an Id");
            return;
        }
        PluginRegistry.set(Entry.Id, Entry);
        if (ApiReady && typeof Entry.Setup === "function") {
            try {
                Entry.Setup(CreatePluginContext(Entry));
            } catch (E) {
                console.error(`Plugin ${Entry.Id} setup failed`, E);
            }
        }
    },

    List() {
        return [...PluginRegistry.values()].map((P) => ({
            Id: P.Id,
            Name: P.Name || P.Id,
            Version: P.Version || "0.0.0",
            Description: P.Description || ""
        }));
    },

    Get(Id) {
        return PluginRegistry.get(Id) || null;
    },

    Boot() {
        if (ApiReady) return;
        ApiReady = true;

        if (Array.isArray(globalThis.FentPlugins)) {
            for (const P of globalThis.FentPlugins) Plugin.Register(P);
        }

        for (const Entry of PluginRegistry.values()) {
            if (typeof Entry.Setup === "function") {
                try {
                    Entry.Setup(CreatePluginContext(Entry));
                } catch (E) {
                    console.error(`Plugin ${Entry.Id} setup failed`, E);
                }
            }
        }

        Emit("Boot", {});
        BuildPluginDock();
    },

    Tick(Dt) {
        Emit("Tick", { Dt, Renderer: GetSim() });
    },

    Emit,
    On
};

globalThis.Plugin = Plugin;