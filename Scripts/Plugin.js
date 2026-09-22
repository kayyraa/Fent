const PluginRegistry = new Map();
const WidgetMap = new Map();
const EventHandlers = new Map();

let WidgetZ = 50;
let ApiReady = false;

const SNAP_MARGIN = 12;
const SNAP_THRESHOLD = 14;

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

function GetSnapTargets(ExcludeEl) {
    const Rects = [];
    document.querySelectorAll(".PluginWidget, .Area").forEach((El) => {
        if (El === ExcludeEl) return;
        if (El.classList.contains("WidgetHidden")) return;
        const R = El.getBoundingClientRect();
        if (R.width < 4 || R.height < 4) return;
        Rects.push({ X: R.left, Y: R.top, W: R.width, H: R.height });
    });
    return Rects;
}

function ComputeSnap(El, X, Y) {
    const W = El.offsetWidth || 200;
    const H = El.offsetHeight || 100;
    const SW = window.innerWidth;
    const SH = window.innerHeight;

    let BestX = X;
    let BestY = Y;
    let BestDX = SNAP_THRESHOLD + 1;
    let BestDY = SNAP_THRESHOLD + 1;

    const TryX = (Val) => {
        const D = Math.abs(X - Val);
        if (D < BestDX) { BestX = Val; BestDX = D; }
    };
    const TryY = (Val) => {
        const D = Math.abs(Y - Val);
        if (D < BestDY) { BestY = Val; BestDY = D; }
    };

    TryX(SNAP_MARGIN);
    TryX(SW - W - SNAP_MARGIN);
    TryY(SNAP_MARGIN);
    TryY(SH - H - SNAP_MARGIN);

    for (const R of GetSnapTargets(El)) {
        TryX(R.X);
        TryX(R.X + R.W - W);
        TryX(R.X + R.W + SNAP_MARGIN);
        TryX(R.X - W - SNAP_MARGIN);
        TryY(R.Y);
        TryY(R.Y + R.H - H);
        TryY(R.Y + R.H + SNAP_MARGIN);
        TryY(R.Y - H - SNAP_MARGIN);
    }

    return [BestX, BestY];
}

function MakeDraggable(El, Handle) {
    let Dragging = false;
    let Ox = 0, Oy = 0;

    const OnDown = (E) => {
        if (E.button !== undefined && E.button !== 0 && E.pointerType !== "touch") return;
        if (E.target.closest("button, input, select, a, textarea")) return;
        Dragging = true;
        const Rect = El.getBoundingClientRect();
        Ox = E.clientX - Rect.left;
        Oy = E.clientY - Rect.top;
        El.style.zIndex = String(++WidgetZ);
        El.style.right = "auto";
        El.style.bottom = "auto";
        if (El.style.left === "auto" || !El.style.left) El.style.left = `${Rect.left}px`;
        if (El.style.top === "auto" || !El.style.top) El.style.top = `${Rect.top}px`;
        Handle.setPointerCapture?.(E.pointerId);
        E.preventDefault();
    };

    const OnMove = (E) => {
        if (!Dragging) return;
        let X = E.clientX - Ox;
        let Y = E.clientY - Oy;
        X = Math.max(0, Math.min(window.innerWidth - 60, X));
        Y = Math.max(0, Math.min(window.innerHeight - 30, Y));
        const [SX, SY] = ComputeSnap(El, X, Y);
        El.style.left = `${SX}px`;
        El.style.top = `${SY}px`;
    };

    const OnUp = () => { Dragging = false; };

    Handle.addEventListener("pointerdown", OnDown);
    window.addEventListener("pointermove", OnMove);
    window.addEventListener("pointerup", OnUp);
    window.addEventListener("pointercancel", OnUp);
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
    CloseBtn.textContent = "x";
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

function FindPluginWidget(PluginId) {
    for (const [Id, El] of WidgetMap) {
        if (Id === PluginId || Id === `${PluginId}_widget` || Id.startsWith(`${PluginId}_`)) return El;
    }
    return null;
}

function GetSim() { return globalThis.CanvasRenderer || null; }

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

function GetAtoms() { return globalThis.Objects || []; }

function GetCameraForward() {
    const R = GetSim();
    if (!R) return [0, 0, -1];
    const Fx = R.CameraTarget[0] - R.CameraPosition[0];
    const Fy = R.CameraTarget[1] - R.CameraPosition[1];
    const Fz = R.CameraTarget[2] - R.CameraPosition[2];
    const L = Math.sqrt(Fx*Fx + Fy*Fy + Fz*Fz) || 1;
    return [Fx/L, Fy/L, Fz/L];
}

function AddSection(Parent, Title, InitiallyOpen = true) {
    const Section = document.createElement("div");
    Section.className = "WSection" + (InitiallyOpen ? " Open" : "");
    const Header = document.createElement("div");
    Header.className = "WSectionHeader";
    const Chev = document.createElement("span");
    Chev.className = "WSectionChevron";
    Chev.textContent = ">";
    const Text = document.createElement("span");
    Text.textContent = Title;
    Header.appendChild(Chev);
    Header.appendChild(Text);
    const Body = document.createElement("div");
    Body.className = "WSectionBody";
    Header.addEventListener("click", () => Section.classList.toggle("Open"));
    Section.appendChild(Header);
    Section.appendChild(Body);
    Parent.appendChild(Section);
    return Body;
}

function AddStatRow(Parent, Label) {
    const Row = document.createElement("div");
    Row.className = "WStatRow";
    const L = document.createElement("span");
    L.textContent = Label;
    const V = document.createElement("span");
    V.textContent = "-";
    Row.appendChild(L);
    Row.appendChild(V);
    Parent.appendChild(Row);
    return V;
}

function AddStepper(Parent, LabelText, Min, Max, Value, OnChange) {
    const Row = document.createElement("div");
    Row.className = "WRow";
    const Lbl = document.createElement("label");
    Lbl.textContent = LabelText;
    const Box = document.createElement("div");
    Box.className = "WStepper";
    const Dec = document.createElement("button");
    Dec.className = "WStepperBtn";
    Dec.type = "button";
    Dec.textContent = "-";
    const Input = document.createElement("input");
    Input.className = "WStepperInput";
    Input.type = "number";
    Input.min = String(Min);
    Input.max = String(Max);
    Input.value = String(Value);
    const Inc = document.createElement("button");
    Inc.className = "WStepperBtn";
    Inc.type = "button";
    Inc.textContent = "+";
    const Clamp = (V) => Math.max(Min, Math.min(Max, Math.round(V)));
    const Apply = (V, Emit2 = true) => {
        const C = Clamp(V);
        Input.value = String(C);
        if (Emit2) OnChange(C);
    };
    Input.addEventListener("input", () => {
        const V = Number(Input.value);
        if (!isNaN(V)) OnChange(Clamp(V));
    });
    Input.addEventListener("blur", () => Apply(Number(Input.value) || 0, false));
    Dec.addEventListener("click", () => Apply((Number(Input.value) || 0) - 1));
    Inc.addEventListener("click", () => Apply((Number(Input.value) || 0) + 1));
    Box.appendChild(Dec);
    Box.appendChild(Input);
    Box.appendChild(Inc);
    Row.appendChild(Lbl);
    Row.appendChild(Box);
    Parent.appendChild(Row);
    return {
        Set(V) { Input.value = String(Clamp(V)); },
        Get() { return Number(Input.value) || 0; }
    };
}

function CreatePluginContext(Entry) {
    return {
        Id: Entry.Id,
        CreateWidget: (Opts) => CreateWidget({ ...Opts, Id: Opts.Id || `${Entry.Id}_widget` }),
        DestroyWidget,
        GetWidget: (Id) => WidgetMap.get(Id) || null,
        AddSection,
        AddStatRow,
        AddStepper,
        SpawnAtom,
        ForceBond,
        ClearAtoms: ClearAllAtoms,
        GetAtoms,
        GetRenderer: GetSim,
        On, Emit,
        GetSelectedAtom() {
            const R = GetSim();
            return R ? R.SelectedObject : null;
        },
        SetSelectedAtom(Atom) {
            const R = GetSim();
            if (!R) return;
            R.SelectedObject = Atom || null;
        },
        GetCameraPosition() {
            const R = GetSim();
            return R ? [...R.CameraPosition] : [0, 0, 0];
        },
        GetCameraForward,
        EmitParticle(Type, Position, Velocity, LifeScale = 1.0) {
            const R = GetSim();
            if (!R || !R.EmitParticle) return;
            R.EmitParticle(Position, Velocity, Type, LifeScale);
        },
        EmitBurst(Type, Position, Count = 1, SpeedMul = 1.0) {
            const R = GetSim();
            if (!R || !R.EmitBurst) return;
            R.EmitBurst(Position, Count, Type, SpeedMul);
        },
        GetParticles() {
            const R = GetSim();
            return R ? R.Particles : [];
        },
        DecayAtom(Atom) {
            const R = GetSim();
            if (!R || !R.DecayAtom) return false;
            return R.DecayAtom(Atom || R.SelectedObject);
        },
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
        Dock.id = "PluginDock";
        Dock.className = "PluginDock";
        document.body.appendChild(Dock);
    }
    Dock.innerHTML = "";

    for (const Entry of PluginRegistry.values()) {
        const Btn = document.createElement("button");
        Btn.className = "PluginDockBtn";
        Btn.textContent = Entry.Name || Entry.Id;
        Btn.title = Entry.Description || Entry.Name || Entry.Id;
        Btn.dataset.pluginId = Entry.Id;

        Btn.addEventListener("click", () => {
            const Existing = FindPluginWidget(Entry.Id);
            if (Existing && !Existing.classList.contains("WidgetHidden")) {
                Existing.classList.add("WidgetHidden");
                Btn.classList.remove("active");
                Emit("ClosePlugin", { Id: Entry.Id });
                return;
            }
            Emit("OpenPlugin", { Id: Entry.Id });
            if (typeof Entry.Open === "function") {
                try { Entry.Open(CreatePluginContext(Entry)); } catch (E) { console.error(E); }
            }
            const Opened = FindPluginWidget(Entry.Id);
            if (Opened) {
                Opened.style.zIndex = String(++WidgetZ);
                Opened.classList.remove("WidgetHidden");
                Btn.classList.add("active");
                const CloseBtn = Opened.querySelector(".WidgetBtn");
                if (CloseBtn && !CloseBtn.dataset.toggleWired) {
                    CloseBtn.dataset.toggleWired = "1";
                    CloseBtn.addEventListener("click", () => {
                        Btn.classList.remove("active");
                    });
                }
            }
        });

        Dock.appendChild(Btn);
    }
}

const Plugin = {
    Register(Entry) {
        if (!Entry || !Entry.Id) { console.warn("Plugin must have an Id"); return; }
        PluginRegistry.set(Entry.Id, Entry);
        if (ApiReady && typeof Entry.Setup === "function") {
            try { Entry.Setup(CreatePluginContext(Entry)); } catch (E) { console.error(`Plugin ${Entry.Id} setup failed`, E); }
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
    Get(Id) { return PluginRegistry.get(Id) || null; },
    Boot() {
        if (ApiReady) return;
        ApiReady = true;
        if (Array.isArray(globalThis.FentPlugins)) for (const P of globalThis.FentPlugins) Plugin.Register(P);
        for (const Entry of PluginRegistry.values()) {
            if (typeof Entry.Setup === "function") {
                try { Entry.Setup(CreatePluginContext(Entry)); } catch (E) { console.error(`Plugin ${Entry.Id} setup failed`, E); }
            }
        }
        Emit("Boot", {});
        BuildPluginDock();
    },
    Tick(Dt) { Emit("Tick", { Dt, Renderer: GetSim() }); },
    Emit, On
};

globalThis.Plugin = Plugin;