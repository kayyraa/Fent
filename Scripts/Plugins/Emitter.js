(function EmitterPlugin() {
    const Types = [
        { Id: "alpha",    Label: "Alpha particle", DefaultSpeed: 22 },
        { Id: "beta",     Label: "Beta- electron", DefaultSpeed: 34 },
        { Id: "positron", Label: "Positron (beta+)", DefaultSpeed: 34 },
        { Id: "neutron",  Label: "Neutron", DefaultSpeed: 22 },
        { Id: "gamma",    Label: "Gamma ray", DefaultSpeed: 80 },
        { Id: "xray",     Label: "X-Ray", DefaultSpeed: 65 },
        { Id: "photon",   Label: "Photon (visible)", DefaultSpeed: 50 },
        { Id: "visible",  Label: "Flash burst", DefaultSpeed: 32 }
    ];

    function OpenWidget(Api) {
        const State = {
            Type: "alpha",
            Count: 12,
            Speed: 30,
            Spread: "isotropic",
            Origin: "selected",
            Continuous: false,
            Rate: 5
        };

        let LastEmit = 0;

        Api.CreateWidget({
            Id: "particle-emitter",
            Title: "Particle Emitter",
            X: 260,
            Y: 240,
            Width: 300,
            Build(Body) {
                const Setup = Api.AddSection(Body, "Source", true);

                const TypeRow = document.createElement("div");
                TypeRow.className = "WRow";
                TypeRow.innerHTML = `<label>Type</label>`;
                const TypeSel = document.createElement("select");
                TypeSel.className = "WSelect";
                for (const T of Types) {
                    const Opt = document.createElement("option");
                    Opt.value = T.Id;
                    Opt.textContent = T.Label;
                    TypeSel.appendChild(Opt);
                }
                TypeSel.value = State.Type;
                TypeRow.appendChild(TypeSel);
                Setup.appendChild(TypeRow);

                const OriginRow = document.createElement("div");
                OriginRow.className = "WRow";
                OriginRow.innerHTML = `<label>Origin</label>`;
                const OriginSel = document.createElement("select");
                OriginSel.className = "WSelect";
                OriginSel.innerHTML = `
                    <option value="selected">Selected atom</option>
                    <option value="camera">In front of camera</option>
                    <option value="origin">World origin</option>
                `;
                OriginRow.appendChild(OriginSel);
                Setup.appendChild(OriginRow);

                const SpreadRow = document.createElement("div");
                SpreadRow.className = "WRow";
                SpreadRow.innerHTML = `<label>Spread</label>`;
                const SpreadSel = document.createElement("select");
                SpreadSel.className = "WSelect";
                SpreadSel.innerHTML = `
                    <option value="isotropic">Isotropic burst</option>
                    <option value="directed">Directed forward</option>
                `;
                SpreadRow.appendChild(SpreadSel);
                Setup.appendChild(SpreadRow);

                const Emission = Api.AddSection(Body, "Emission", true);

                const CountRow = document.createElement("div");
                CountRow.className = "WRow";
                CountRow.innerHTML = `<label>Count</label>`;
                const CountInput = document.createElement("input");
                CountInput.type = "range";
                CountInput.className = "WRange";
                CountInput.min = "1";
                CountInput.max = "300";
                CountInput.value = "12";
                const CountVal = document.createElement("span");
                CountVal.className = "WHint";
                CountVal.style.minWidth = "34px";
                CountVal.style.textAlign = "right";
                CountVal.textContent = "12";
                CountRow.appendChild(CountInput);
                CountRow.appendChild(CountVal);
                Emission.appendChild(CountRow);

                const SpeedRow = document.createElement("div");
                SpeedRow.className = "WRow";
                SpeedRow.innerHTML = `<label>Speed</label>`;
                const SpeedInput = document.createElement("input");
                SpeedInput.type = "range";
                SpeedInput.className = "WRange";
                SpeedInput.min = "2";
                SpeedInput.max = "200";
                SpeedInput.value = "30";
                const SpeedVal = document.createElement("span");
                SpeedVal.className = "WHint";
                SpeedVal.style.minWidth = "34px";
                SpeedVal.style.textAlign = "right";
                SpeedVal.textContent = "30";
                SpeedRow.appendChild(SpeedInput);
                SpeedRow.appendChild(SpeedVal);
                Emission.appendChild(SpeedRow);

                const ContRow = document.createElement("div");
                ContRow.className = "WRow";
                const ContLabel = document.createElement("label");
                ContLabel.className = "WCheck";
                const ContInput = document.createElement("input");
                ContInput.type = "checkbox";
                ContLabel.appendChild(ContInput);
                ContLabel.appendChild(document.createTextNode("Continuous stream"));
                ContRow.appendChild(ContLabel);
                Emission.appendChild(ContRow);

                const RateRow = document.createElement("div");
                RateRow.className = "WRow";
                RateRow.innerHTML = `<label>Rate/s</label>`;
                const RateInput = document.createElement("input");
                RateInput.type = "range";
                RateInput.className = "WRange";
                RateInput.min = "1";
                RateInput.max = "120";
                RateInput.value = "5";
                const RateVal = document.createElement("span");
                RateVal.className = "WHint";
                RateVal.style.minWidth = "34px";
                RateVal.style.textAlign = "right";
                RateVal.textContent = "5";
                RateRow.appendChild(RateInput);
                RateRow.appendChild(RateVal);
                Emission.appendChild(RateRow);

                const Action = Api.AddSection(Body, "Trigger", true);
                const Hint = document.createElement("div");
                Hint.className = "WHint";
                Hint.textContent = "Particles kick atoms, excite them, and neutrons may trigger decay on unstable nuclei.";
                Action.appendChild(Hint);

                const FireRow = document.createElement("div");
                FireRow.className = "WActions";
                const FireBtn = document.createElement("button");
                FireBtn.className = "WPrimary";
                FireBtn.textContent = "Emit burst";
                FireRow.appendChild(FireBtn);
                Action.appendChild(FireRow);

                TypeSel.addEventListener("change", () => {
                    State.Type = TypeSel.value;
                    const T = Types.find((X) => X.Id === State.Type);
                    if (T) {
                        SpeedInput.value = String(T.DefaultSpeed);
                        SpeedVal.textContent = String(T.DefaultSpeed);
                        State.Speed = T.DefaultSpeed;
                    }
                });
                OriginSel.addEventListener("change", () => { State.Origin = OriginSel.value; });
                SpreadSel.addEventListener("change", () => { State.Spread = SpreadSel.value; });
                CountInput.addEventListener("input", () => {
                    State.Count = Number(CountInput.value) || 1;
                    CountVal.textContent = String(State.Count);
                });
                SpeedInput.addEventListener("input", () => {
                    State.Speed = Number(SpeedInput.value) || 1;
                    SpeedVal.textContent = String(State.Speed);
                });
                ContInput.addEventListener("change", () => { State.Continuous = ContInput.checked; });
                RateInput.addEventListener("input", () => {
                    State.Rate = Number(RateInput.value) || 1;
                    RateVal.textContent = String(State.Rate);
                });

                function GetOrigin() {
                    if (State.Origin === "selected") {
                        const A = Api.GetSelectedAtom();
                        if (A) return [...A.Position];
                    }
                    if (State.Origin === "camera") {
                        const Cam = Api.GetCameraPosition();
                        const Fwd = Api.GetCameraForward();
                        return [Cam[0] + Fwd[0] * 120, Cam[1] + Fwd[1] * 120, Cam[2] + Fwd[2] * 120];
                    }
                    return [0, 0, 0];
                }

                function Fire() {
                    const Origin = GetOrigin();
                    if (State.Spread === "directed") {
                        const Fwd = Api.GetCameraForward();
                        const Speed = State.Speed;
                        for (let i = 0; i < State.Count; i++) {
                            const Jitter = 0.14;
                            const Vx = (Fwd[0] + (Math.random() - 0.5) * Jitter) * Speed;
                            const Vy = (Fwd[1] + (Math.random() - 0.5) * Jitter) * Speed;
                            const Vz = (Fwd[2] + (Math.random() - 0.5) * Jitter) * Speed;
                            Api.EmitParticle(State.Type, Origin, [Vx, Vy, Vz], 1.0);
                        }
                    } else {
                        const BaseSpeed = State.Speed;
                        for (let i = 0; i < State.Count; i++) {
                            const Theta = Math.random() * Math.PI * 2;
                            const Phi = Math.acos(2 * Math.random() - 1);
                            const S = BaseSpeed * (0.7 + Math.random() * 0.6);
                            const Vx = Math.sin(Phi) * Math.cos(Theta) * S;
                            const Vy = Math.sin(Phi) * Math.sin(Theta) * S;
                            const Vz = Math.cos(Phi) * S;
                            Api.EmitParticle(State.Type, Origin, [Vx, Vy, Vz], 1.0);
                        }
                    }
                }

                FireBtn.addEventListener("click", Fire);

                Api.On("Tick", () => {
                    if (!State.Continuous) return;
                    const Now = performance.now();
                    const Interval = 1000 / Math.max(1, State.Rate);
                    if (Now - LastEmit < Interval) return;
                    LastEmit = Now;
                    const Saved = State.Count;
                    State.Count = Math.max(1, Math.floor(Saved / 4));
                    Fire();
                    State.Count = Saved;
                });
            }
        });
    }

    const Entry = {
        Id: "particle-emitter",
        Name: "Emitter",
        Version: "1.1.0",
        Description: "Fire alpha, beta, gamma, x-ray, neutron and photon particles manually",
        Setup(Api) {
            Api.On("OpenPlugin", ({ Id }) => {
                if (Id === "particle-emitter") OpenWidget(Api);
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