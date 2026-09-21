(function NuclearInspectorPlugin() {
    function OpenWidget(Api) {
        const State = {
            LastSignature: "",
            Suppress: false
        };

        Api.CreateWidget({
            Id: "nuclear-inspector",
            Title: "Nuclear Inspector",
            X: 560,
            Y: 12,
            Width: 320,
            Build(Body) {
                const EmptyEl = document.createElement("div");
                EmptyEl.className = "WHint";
                EmptyEl.textContent = "Select an atom in the scene or hierarchy to inspect and edit its subatomic structure.";
                Body.appendChild(EmptyEl);

                const Panel = document.createElement("div");
                Panel.style.display = "none";
                Panel.style.flexDirection = "column";
                Panel.style.gap = "8px";
                Body.appendChild(Panel);

                const Identity = Api.AddSection(Panel, "Identity", true);
                const ElementRow = document.createElement("div");
                ElementRow.className = "WStatRow";
                ElementRow.innerHTML = `<span>Element</span><span id="NiElement">-</span>`;
                Identity.appendChild(ElementRow);
                const ElementVal = ElementRow.querySelector("#NiElement");

                const MassRow = document.createElement("div");
                MassRow.className = "WStatRow";
                MassRow.innerHTML = `<span>Mass A</span><span id="NiA">0</span>`;
                Identity.appendChild(MassRow);
                const MassVal = MassRow.querySelector("#NiA");

                const NZRow = document.createElement("div");
                NZRow.className = "WStatRow";
                NZRow.innerHTML = `<span>N/Z</span><span id="NiNZ">0.00</span>`;
                Identity.appendChild(NZRow);
                const NZVal = NZRow.querySelector("#NiNZ");

                const IdealRow = document.createElement("div");
                IdealRow.className = "WStatRow";
                IdealRow.innerHTML = `<span>Ideal N/Z</span><span id="NiIdeal">0.00</span>`;
                Identity.appendChild(IdealRow);
                const IdealVal = IdealRow.querySelector("#NiIdeal");

                const StableRow = document.createElement("div");
                StableRow.className = "WStatRow";
                StableRow.innerHTML = `<span>Stability</span><span id="NiStable">-</span>`;
                Identity.appendChild(StableRow);
                const StableVal = StableRow.querySelector("#NiStable");

                const ModeRow = document.createElement("div");
                ModeRow.className = "WStatRow";
                ModeRow.innerHTML = `<span>Decay mode</span><span id="NiMode">-</span>`;
                Identity.appendChild(ModeRow);
                const ModeVal = ModeRow.querySelector("#NiMode");

                const SubAtom = Api.AddSection(Panel, "Sub-Atomic Editing", true);
                const SubHint = document.createElement("div");
                SubHint.className = "WHint";
                SubHint.textContent = "Adjust protons, neutrons, or electrons. The atom updates live.";
                SubAtom.appendChild(SubHint);

                let CurrentZ = 0;
                let CurrentN = 0;
                let CurrentE = 0;

                const ApplyChanges = () => {
                    const Atom = Api.GetSelectedAtom();
                    if (!Atom) return;

                    Atom.Protons = Math.max(0, CurrentZ);
                    Atom.Neutrons = Math.max(0, CurrentN);
                    Atom.ExtraCharge = CurrentZ - CurrentE;

                    const Chem = globalThis.Chemistry;
                    if (Chem && Chem.SymbolFromZ) {
                        const Sym = Chem.SymbolFromZ(CurrentZ);
                        if (Sym && Atoms[Sym]) {
                            Atom.Key = Sym;
                            const BaseData = Atoms[Sym];
                            Atom.Atom = {
                                ...BaseData,
                                AtomicMass: Math.max(0, CurrentZ + CurrentN) || BaseData.AtomicMass,
                                Valence: (globalThis.RealisticValence && globalThis.RealisticValence[Sym] != null)
                                    ? globalThis.RealisticValence[Sym]
                                    : (BaseData.Valence ?? 1)
                            };
                        } else if (CurrentZ === 0) {
                            Atom.Key = "n";
                            Atom.Atom = {
                                ...Atom.Atom,
                                Name: "Neutronium",
                                AtomicMass: CurrentN || 1,
                                AtomicNumber: 0,
                                Valence: 0
                            };
                        }
                    }

                    if (Chem && Chem.DecayProbability) {
                        Atom.Stable = Chem.DecayProbability(Atom.Protons, Atom.Neutrons) === 0;
                    }

                    State.Suppress = true;
                    ZStepper.Set(CurrentZ);
                    NStepper.Set(CurrentN);
                    EStepper.Set(CurrentE);
                    State.Suppress = false;
                };

                const ZStepper = Api.AddStepper(SubAtom, "Protons Z", 0, 118, 6, (V) => {
                    if (State.Suppress) return;
                    CurrentZ = V;
                    if (CurrentE > CurrentZ) CurrentE = CurrentZ;
                    ApplyChanges();
                });

                const NStepper = Api.AddStepper(SubAtom, "Neutrons N", 0, 220, 6, (V) => {
                    if (State.Suppress) return;
                    CurrentN = V;
                    ApplyChanges();
                });

                const EStepper = Api.AddStepper(SubAtom, "Electrons", 0, 118, 6, (V) => {
                    if (State.Suppress) return;
                    CurrentE = V;
                    ApplyChanges();
                });

                const ChargeRow = document.createElement("div");
                ChargeRow.className = "WStatRow";
                ChargeRow.innerHTML = `<span>Net charge</span><span id="NiCharge">0</span>`;
                SubAtom.appendChild(ChargeRow);
                const ChargeVal = ChargeRow.querySelector("#NiCharge");

                const QuickRow = document.createElement("div");
                QuickRow.style.display = "flex";
                QuickRow.style.gap = "6px";
                QuickRow.style.marginTop = "4px";

                const NeutralizeBtn = document.createElement("button");
                NeutralizeBtn.className = "WPrimary";
                NeutralizeBtn.textContent = "Neutralize";
                NeutralizeBtn.addEventListener("click", () => {
                    CurrentE = CurrentZ;
                    ApplyChanges();
                });
                QuickRow.appendChild(NeutralizeBtn);

                const StableBtn = document.createElement("button");
                StableBtn.className = "WPrimary";
                StableBtn.textContent = "Auto-stable";
                StableBtn.addEventListener("click", () => {
                    const Chem = globalThis.Chemistry;
                    if (!Chem || !Chem.IdealNZ) return;
                    const Ideal = Chem.IdealNZ(CurrentZ);
                    const TargetN = Math.max(0, Math.round(CurrentZ * Ideal));
                    CurrentN = TargetN;
                    if (CurrentE > CurrentZ) CurrentE = CurrentZ;
                    ApplyChanges();
                });
                QuickRow.appendChild(StableBtn);

                SubAtom.appendChild(QuickRow);

                const View = Api.AddSection(Panel, "Isotope View", true);
                const CanvasEl = document.createElement("canvas");
                CanvasEl.width = 380;
                CanvasEl.height = 180;
                CanvasEl.style.width = "100%";
                CanvasEl.style.borderRadius = "7px";
                CanvasEl.style.background = "rgba(0,0,0,0.35)";
                CanvasEl.style.display = "block";
                View.appendChild(CanvasEl);
                const Ctx = CanvasEl.getContext("2d");

                const Chem = Api.AddSection(Panel, "Chemistry", false);
                const ValRow = document.createElement("div");
                ValRow.className = "WStatRow";
                ValRow.innerHTML = `<span>Valence</span><span id="NiVal">0</span>`;
                Chem.appendChild(ValRow);
                const ValVal = ValRow.querySelector("#NiVal");

                const BondsRow = document.createElement("div");
                BondsRow.className = "WStatRow";
                BondsRow.innerHTML = `<span>Bonds</span><span id="NiBonds">0 / 0</span>`;
                Chem.appendChild(BondsRow);
                const BondsVal = BondsRow.querySelector("#NiBonds");

                const PartialRow = document.createElement("div");
                PartialRow.className = "WStatRow";
                PartialRow.innerHTML = `<span>Partial charge</span><span id="NiPartial">0.00</span>`;
                Chem.appendChild(PartialRow);
                const PartialVal = PartialRow.querySelector("#NiPartial");

                const ExciteRow = document.createElement("div");
                ExciteRow.className = "WStatRow";
                ExciteRow.innerHTML = `<span>Excitation</span><span id="NiExcite">0.00</span>`;
                Chem.appendChild(ExciteRow);
                const ExciteVal = ExciteRow.querySelector("#NiExcite");

                const Actions = Api.AddSection(Panel, "Actions", false);
                const ActionRow = document.createElement("div");
                ActionRow.className = "WActions";

                const DecayBtn = document.createElement("button");
                DecayBtn.className = "WPrimary";
                DecayBtn.textContent = "Force decay";
                DecayBtn.addEventListener("click", () => {
                    const A = Api.GetSelectedAtom();
                    if (A) Api.DecayAtom(A);
                });
                ActionRow.appendChild(DecayBtn);

                const ClearExciteBtn = document.createElement("button");
                ClearExciteBtn.className = "WPrimary";
                ClearExciteBtn.textContent = "Cool down";
                ClearExciteBtn.addEventListener("click", () => {
                    const A = Api.GetSelectedAtom();
                    if (A) A.Excited = 0;
                });
                ActionRow.appendChild(ClearExciteBtn);

                Actions.appendChild(ActionRow);

                function CountBonds(Atom) {
                    const Objects = Api.GetAtoms();
                    const Idx = Objects.indexOf(Atom);
                    if (Idx < 0) return 0;
                    const R = Api.GetRenderer();
                    if (!R) return 0;
                    let Count = 0;
                    for (const Key of R.ActiveBondPairs) {
                        const [A, B] = Key.split("_").map(Number);
                        if (A === Idx || B === Idx) Count++;
                    }
                    return Count;
                }

                function DrawIsotope(Atom) {
                    const W = CanvasEl.width;
                    const H = CanvasEl.height;
                    Ctx.clearRect(0, 0, W, H);

                    const Z = Atom.Protons || 0;
                    const N = Atom.Neutrons || 0;
                    const Total = Z + N;
                    if (Total <= 0) return;

                    const Cx = W / 2;
                    const Cy = H / 2;
                    const MaxRadius = Math.min(W, H) * 0.42;

                    const Scale = Math.min(1, Math.sqrt(80 / Total));
                    const ProtonRadius = 8 * Scale + 1.5;
                    const Radius = Math.max(ProtonRadius * 2, MaxRadius * Math.sqrt(Total / 80));
                    const Spacing = ProtonRadius * 1.75;

                    let Seed = Z * 31 + N * 17 + 7;
                    const Rand = () => {
                        Seed = (Seed * 9301 + 49297) % 233280;
                        return Seed / 233280;
                    };

                    const Placed = [];
                    const Attempt = (Color) => {
                        for (let T = 0; T < 60; T++) {
                            const Angle = Rand() * Math.PI * 2;
                            const R = Math.sqrt(Rand()) * Radius;
                            const X = Math.cos(Angle) * R;
                            const Y = Math.sin(Angle) * R;
                            let OK = true;
                            for (const P of Placed) {
                                const Dx = P.X - X;
                                const Dy = P.Y - Y;
                                const MinDist = Spacing * (P.IsProton === (Color === "#ff5a5a") ? 1 : 0.85);
                                if (Dx * Dx + Dy * Dy < MinDist * MinDist) { OK = false; break; }
                            }
                            if (OK) {
                                Placed.push({ X, Y, Color, IsProton: Color === "#ff5a5a" });
                                return;
                            }
                        }
                        const Angle = Rand() * Math.PI * 2;
                        const R = Math.sqrt(Rand()) * Radius;
                        Placed.push({
                            X: Math.cos(Angle) * R,
                            Y: Math.sin(Angle) * R,
                            Color,
                            IsProton: Color === "#ff5a5a"
                        });
                    };

                    for (let i = 0; i < Z; i++) Attempt("#ff5a5a");
                    for (let i = 0; i < N; i++) Attempt("#a8a8b0");

                    for (const P of Placed) {
                        const X = Cx + P.X;
                        const Y = Cy + P.Y;
                        const Grad = Ctx.createRadialGradient(
                            X - ProtonRadius * 0.3, Y - ProtonRadius * 0.3, 0,
                            X, Y, ProtonRadius
                        );
                        Grad.addColorStop(0, "rgba(255,255,255,0.85)");
                        Grad.addColorStop(0.4, P.Color);
                        Grad.addColorStop(1, P.Color);
                        Ctx.beginPath();
                        Ctx.arc(X, Y, ProtonRadius, 0, Math.PI * 2);
                        Ctx.fillStyle = Grad;
                        Ctx.fill();
                    }

                    Ctx.font = "11px 'Cascadia Mono', monospace";
                    Ctx.fillStyle = "rgba(255,90,90,0.9)";
                    Ctx.fillText(`p ${Z}`, 8, 16);
                    Ctx.fillStyle = "rgba(200,200,210,0.9)";
                    Ctx.fillText(`n ${N}`, 8, 30);
                }

                function SyncToAtom(Atom) {
                    const Z = Atom.Protons || 0;
                    const N = Atom.Neutrons || 0;
                    const E = Math.max(0, Math.round(Z - (Atom.ExtraCharge || 0)));
                    CurrentZ = Z;
                    CurrentN = N;
                    CurrentE = E;
                    State.Suppress = true;
                    ZStepper.Set(Z);
                    NStepper.Set(N);
                    EStepper.Set(E);
                    State.Suppress = false;
                }

                function Refresh() {
                    const Atom = Api.GetSelectedAtom();
                    if (!Atom) {
                        EmptyEl.style.display = "";
                        Panel.style.display = "none";
                        State.LastSignature = "";
                        return;
                    }
                    EmptyEl.style.display = "none";
                    Panel.style.display = "flex";

                    const ChemRef = globalThis.Chemistry;
                    const Z = Atom.Protons || 0;
                    const N = Atom.Neutrons || 0;
                    const A = Z + N;
                    const NZ = Z > 0 ? N / Z : 0;
                    const Ideal = ChemRef && ChemRef.IdealNZ ? ChemRef.IdealNZ(Z) : 1;
                    const Stable = Atom.Stable;
                    const Mode = ChemRef && ChemRef.DecayMode ? ChemRef.DecayMode(Z, N) : "-";

                    const Sig = `${Z}_${N}_${Atom.ExtraCharge || 0}_${Stable}_${(Atom.Excited || 0).toFixed(2)}`;
                    if (Sig !== State.LastSignature) {
                        State.LastSignature = Sig;
                        SyncToAtom(Atom);
                    }

                    ElementVal.textContent = `${Atom.Key} - ${Atom.Atom.Name || Atom.Key}`;
                    MassVal.textContent = String(A);
                    NZVal.textContent = NZ.toFixed(3);
                    IdealVal.textContent = Ideal.toFixed(3);

                    if (Stable) {
                        StableVal.textContent = "Stable";
                        StableVal.style.color = "#4cd964";
                    } else {
                        StableVal.textContent = "UNSTABLE";
                        StableVal.style.color = "#ff4d6d";
                        StableVal.style.fontWeight = "600";
                    }

                    if (!Stable) {
                        const ModeColors = {
                            "alpha": "#ff7040",
                            "beta-minus": "#59d9ff",
                            "beta-plus": "#ffe033",
                            "gamma": "#f08cff"
                        };
                        ModeVal.textContent = Mode;
                        ModeVal.style.color = ModeColors[Mode] || "#ffffff";
                    } else {
                        ModeVal.textContent = "-";
                        ModeVal.style.color = "rgba(255,255,255,0.5)";
                    }

                    const Charge = Z - CurrentE;
                    ChargeVal.textContent = (Charge > 0 ? "+" : "") + Charge;

                    ValVal.textContent = String(Atom.Atom.Valence ?? 0);
                    const BondCount = CountBonds(Atom);
                    BondsVal.textContent = `${BondCount} / ${Atom.Atom.Valence ?? 0}`;
                    PartialVal.textContent = (Atom.PartialCharge || 0).toFixed(3);
                    ExciteVal.textContent = (Atom.Excited || 0).toFixed(3);

                    const ViewSig = `${Z}_${N}`;
                    if (ViewSig !== State.LastViewSig) {
                        State.LastViewSig = ViewSig;
                        DrawIsotope(Atom);
                    }
                }

                Api.On("Tick", Refresh);
            }
        });
    }

    const Entry = {
        Id: "nuclear-inspector",
        Name: "Nuclear Inspector",
        Version: "1.2.0",
        Description: "Inspect and edit subatomic particles of the selected atom",
        Setup(Api) {
            Api.On("OpenPlugin", ({ Id }) => {
                if (Id === "nuclear-inspector") OpenWidget(Api);
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