(function RadiationMonitorPlugin() {
    const Types = ["alpha", "beta", "positron", "neutron", "gamma", "xray", "photon", "visible"];

    const Meta = {
        alpha:    { Label: "a",   Color: "#ff7040" },
        beta:     { Label: "b-",  Color: "#59d9ff" },
        positron: { Label: "b+",  Color: "#ffe033" },
        neutron:  { Label: "n",   Color: "#e6e6e6" },
        gamma:    { Label: "g",   Color: "#f08cff" },
        xray:     { Label: "x",   Color: "#b8e6ff" },
        photon:   { Label: "hv",  Color: "#fff59b" },
        visible:  { Label: "vis", Color: "#ffe066" }
    };

    const WindowMs = 15000;
    const SampleIntervalMs = 80;

    function OpenWidget(Api) {
        const State = {
            History: [],
            LastSample: 0,
            Decays: 0,
            SessionStart: performance.now(),
            Recent: [],
            Current: {}
        };

        for (const T of Types) State.Current[T] = 0;

        const UnsubDecay = Api.On("Decay", (Ev) => {
            State.Decays++;
            State.Recent.unshift({
                T: performance.now(),
                FromKey: Ev.FromKey,
                ToKey: Ev.ToKey,
                Mode: Ev.Mode,
                FromZ: Ev.FromZ,
                FromN: Ev.FromN,
                ToZ: Ev.ToZ,
                ToN: Ev.ToN
            });
            if (State.Recent.length > 40) State.Recent.length = 40;
        });

        Api.CreateWidget({
            Id: "radiation-monitor",
            Title: "Radiation Monitor",
            X: 300,
            Y: 12,
            Width: 360,
            OnClose() {
                if (UnsubDecay) UnsubDecay();
            },
            Build(Body) {
                const Overview = Api.AddSection(Body, "Overview", true);
                const GraphBody = Api.AddSection(Body, "Emission Graph", true);
                const LogBody = Api.AddSection(Body, "Decay Log", false);

                const LiveRow = document.createElement("div");
                LiveRow.className = "WStatRow";
                LiveRow.innerHTML = `<span>Active particles</span><span id="RmLive">0</span>`;
                Overview.appendChild(LiveRow);
                const LiveVal = LiveRow.querySelector("#RmLive");

                const DecaysRow = document.createElement("div");
                DecaysRow.className = "WStatRow";
                DecaysRow.innerHTML = `<span>Total decays</span><span id="RmDecays">0</span>`;
                Overview.appendChild(DecaysRow);
                const DecaysVal = DecaysRow.querySelector("#RmDecays");

                const RateRow = document.createElement("div");
                RateRow.className = "WStatRow";
                RateRow.innerHTML = `<span>Decay rate</span><span id="RmRate">0.00/s</span>`;
                Overview.appendChild(RateRow);
                const RateVal = RateRow.querySelector("#RmRate");

                const LegendEl = document.createElement("div");
                LegendEl.className = "WLegend";
                GraphBody.appendChild(LegendEl);

                const LegendVals = {};
                for (const T of Types) {
                    const Item = document.createElement("div");
                    Item.className = "WLegendItem";
                    const Dot = document.createElement("span");
                    Dot.className = "WLegendDot";
                    Dot.style.background = Meta[T].Color;
                    Dot.style.boxShadow = `0 0 5px ${Meta[T].Color}`;
                    const Label = document.createElement("span");
                    Label.textContent = Meta[T].Label;
                    const Val = document.createElement("span");
                    Val.className = "WLegendVal";
                    Val.textContent = "0";
                    Item.appendChild(Dot);
                    Item.appendChild(Label);
                    Item.appendChild(Val);
                    LegendEl.appendChild(Item);
                    LegendVals[T] = Val;
                }

                const Canvas = document.createElement("canvas");
                Canvas.className = "WGraph";
                Canvas.width = 640;
                Canvas.height = 260;
                GraphBody.appendChild(Canvas);
                const Ctx = Canvas.getContext("2d");

                const ClearRow = document.createElement("div");
                ClearRow.className = "WActions";
                const ClearBtn = document.createElement("button");
                ClearBtn.className = "WPrimary";
                ClearBtn.textContent = "Clear log";
                ClearBtn.addEventListener("click", () => {
                    State.Recent = [];
                    State.History = [];
                    State.Decays = 0;
                    State.SessionStart = performance.now();
                    LogEl.innerHTML = "";
                });
                ClearRow.appendChild(ClearBtn);
                LogBody.appendChild(ClearRow);

                const LogEl = document.createElement("div");
                LogEl.style.display = "flex";
                LogEl.style.flexDirection = "column";
                LogEl.style.gap = "2px";
                LogEl.style.maxHeight = "180px";
                LogEl.style.overflowY = "auto";
                LogEl.style.fontSize = "11px";
                LogEl.style.fontVariantNumeric = "tabular-nums";
                LogBody.appendChild(LogEl);

                function DrawGraph() {
                    const W = Canvas.width;
                    const H = Canvas.height;
                    Ctx.clearRect(0, 0, W, H);

                    Ctx.fillStyle = "rgba(0,0,0,0.0)";
                    Ctx.fillRect(0, 0, W, H);

                    Ctx.strokeStyle = "rgba(255,255,255,0.05)";
                    Ctx.lineWidth = 1;
                    for (let i = 1; i < 5; i++) {
                        const Y = (i / 5) * H;
                        Ctx.beginPath();
                        Ctx.moveTo(0, Y);
                        Ctx.lineTo(W, Y);
                        Ctx.stroke();
                    }
                    for (let i = 1; i < 6; i++) {
                        const X = (i / 6) * W;
                        Ctx.beginPath();
                        Ctx.moveTo(X, 0);
                        Ctx.lineTo(X, H);
                        Ctx.stroke();
                    }

                    if (State.History.length < 2) {
                        Ctx.fillStyle = "rgba(255,255,255,0.2)";
                        Ctx.font = "20px 'Cascadia Mono', monospace";
                        Ctx.textAlign = "center";
                        Ctx.fillText("collecting...", W / 2, H / 2);
                        Ctx.textAlign = "left";
                        return;
                    }

                    let MaxVal = 2;
                    for (const Sample of State.History) {
                        for (const T of Types) {
                            if ((Sample[T] || 0) > MaxVal) MaxVal = Sample[T];
                        }
                    }
                    MaxVal = Math.ceil(MaxVal * 1.2);

                    const Now = performance.now();
                    const Start = Now - WindowMs;
                    const PadTop = 10;
                    const PadBottom = 4;
                    const PlotH = H - PadTop - PadBottom;

                    for (const T of Types) {
                        const Color = Meta[T].Color;
                        Ctx.strokeStyle = Color;
                        Ctx.lineWidth = 1.6;
                        Ctx.beginPath();
                        let Started = false;
                        for (const Sample of State.History) {
                            const X = ((Sample._t - Start) / WindowMs) * W;
                            if (X < 0) continue;
                            const V = Sample[T] || 0;
                            const Y = PadTop + PlotH - (V / MaxVal) * PlotH;
                            if (!Started) { Ctx.moveTo(X, Y); Started = true; }
                            else Ctx.lineTo(X, Y);
                        }
                        Ctx.stroke();
                    }

                    Ctx.fillStyle = "rgba(255,255,255,0.35)";
                    Ctx.font = "10px 'Cascadia Mono', monospace";
                    Ctx.textAlign = "left";
                    Ctx.fillText(String(MaxVal), 4, 12);
                    Ctx.fillText("0", 4, H - 4);
                    Ctx.textAlign = "right";
                    Ctx.fillText("-15s", W - 4, H - 4);
                    Ctx.textAlign = "left";
                }

                const Ticker = Api.On("Tick", () => {
                    const Now = performance.now();
                    const Particles = Api.GetParticles();
                    const Counts = {};
                    for (const T of Types) Counts[T] = 0;
                    for (const P of Particles) {
                        if (Counts[P.Type] === undefined) Counts[P.Type] = 0;
                        Counts[P.Type]++;
                    }

                    LiveVal.textContent = String(Particles.length);
                    DecaysVal.textContent = String(State.Decays);
                    const Elapsed = Math.max(1, (Now - State.SessionStart) / 1000);
                    RateVal.textContent = `${(State.Decays / Elapsed).toFixed(2)}/s`;

                    State.Current = Counts;
                    for (const T of Types) {
                        if (LegendVals[T]) LegendVals[T].textContent = String(Counts[T] || 0);
                    }

                    if (Now - State.LastSample >= SampleIntervalMs) {
                        State.LastSample = Now;
                        const Sample = { _t: Now };
                        for (const T of Types) Sample[T] = Counts[T] || 0;
                        State.History.push(Sample);
                        while (State.History.length > 0 && Now - State.History[0]._t > WindowMs) {
                            State.History.shift();
                        }
                    }

                    DrawGraph();

                    LogEl.innerHTML = "";
                    for (const Ev of State.Recent) {
                        const Row = document.createElement("div");
                        Row.style.display = "flex";
                        Row.style.flexDirection = "row";
                        Row.style.alignItems = "center";
                        Row.style.gap = "6px";
                        Row.style.padding = "2px 4px";
                        Row.style.borderRadius = "4px";
                        Row.style.background = "rgba(255,255,255,0.03)";

                        const ModeColor = Ev.Mode === "alpha" ? Meta.alpha.Color
                            : Ev.Mode === "beta-minus" ? Meta.beta.Color
                            : Ev.Mode === "beta-plus" ? Meta.positron.Color
                            : Meta.gamma.Color;

                        const Age = ((Now - Ev.T) / 1000).toFixed(1);

                        const Tag = document.createElement("span");
                        Tag.textContent = Ev.Mode;
                        Tag.style.color = ModeColor;
                        Tag.style.fontWeight = "600";
                        Tag.style.minWidth = "74px";

                        const Trans = document.createElement("span");
                        Trans.textContent = `${Ev.FromKey}-${Ev.FromZ + Ev.FromN} -> ${Ev.ToKey}-${Ev.ToZ + Ev.ToN}`;
                        Trans.style.flex = "1";
                        Trans.style.color = "rgba(255,255,255,0.75)";

                        const Time = document.createElement("span");
                        Time.textContent = `${Age}s`;
                        Time.style.color = "rgba(255,255,255,0.35)";

                        Row.appendChild(Tag);
                        Row.appendChild(Trans);
                        Row.appendChild(Time);
                        LogEl.appendChild(Row);
                    }
                });

                DrawGraph();
            }
        });
    }

    const Entry = {
        Id: "radiation-monitor",
        Name: "Radiation Monitor",
        Version: "1.2.0",
        Description: "Live emission line graph and nuclear decay log",
        Setup(Api) {
            Api.On("OpenPlugin", ({ Id }) => {
                if (Id === "radiation-monitor") OpenWidget(Api);
            });
        },
        Open(Api) {
            OpenWidget(Api);
        }
    };

    if (globalThis.Plugin) {
        globalThis.Plugin.Register(Entry);
    } else {
        globalThis.FentPlugins = globalThis.FentPlugins || [];
        globalThis.FentPlugins.push(Entry);
    }
})();