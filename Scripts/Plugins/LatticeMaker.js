(function LatticeMakerPlugin() {
    const Presets = {
        Diamond: { Label: "Diamond (C)", Desc: "Tetrahedral carbon lattice", Element: "C", Scale: 72, Ionize: false },
        Graphite: { Label: "Graphite (C)", Desc: "Hexagonal carbon sheets", Element: "C", Scale: 70, Ionize: false },
        NaCl: { Label: "Rock salt (NaCl)", Desc: "FCC ionic lattice", Element: null, Scale: 95, Ionize: true },
        Fcc: { Label: "FCC metal", Desc: "Face-centered cubic", Element: "Cu", Scale: 85, Ionize: false },
        Bcc: { Label: "BCC metal", Desc: "Body-centered cubic", Element: "Fe", Scale: 90, Ionize: false },
        Sc: { Label: "Simple cubic", Desc: "Primitive cubic cell", Element: "Po", Scale: 100, Ionize: false }
    };

    function CellPositions(Type, Nx, Ny, Nz, Scale) {
        const Pts = [];
        const S = Scale;

        if (Type === "Diamond") {
            const Basis = [[0, 0, 0], [0.25, 0.25, 0.25]];
            for (let Ix = 0; Ix < Nx; Ix++) {
                for (let Iy = 0; Iy < Ny; Iy++) {
                    for (let Iz = 0; Iz < Nz; Iz++) {
                        const Fcc = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
                        for (const F of Fcc) {
                            for (const B of Basis) {
                                Pts.push({
                                    X: (Ix + F[0] + B[0]) * S,
                                    Y: (Iy + F[1] + B[1]) * S,
                                    Z: (Iz + F[2] + B[2]) * S,
                                    Key: "C"
                                });
                            }
                        }
                    }
                }
            }
        } else if (Type === "Graphite") {
            const A = S;
            const C = S * 1.65;
            for (let Iz = 0; Iz < Nz; Iz++) {
                const Shift = (Iz % 2) * 0.5;
                for (let Iy = 0; Iy < Ny; Iy++) {
                    for (let Ix = 0; Ix < Nx; Ix++) {
                        const X0 = (Ix + Shift * 0.5) * A;
                        const Y0 = Iy * A * Math.sqrt(3) * 0.5;
                        const Z0 = Iz * C;
                        Pts.push({ X: X0, Y: Y0, Z: Z0, Key: "C" });
                        Pts.push({ X: X0 + A * 0.5, Y: Y0 + A * Math.sqrt(3) / 6, Z: Z0, Key: "C" });
                    }
                }
            }
        } else if (Type === "NaCl") {
            for (let Ix = 0; Ix < Nx; Ix++) {
                for (let Iy = 0; Iy < Ny; Iy++) {
                    for (let Iz = 0; Iz < Nz; Iz++) {
                        const Even = (Ix + Iy + Iz) % 2 === 0;
                        Pts.push({
                            X: Ix * S, Y: Iy * S, Z: Iz * S,
                            Key: Even ? "Na" : "Cl",
                            Charge: Even ? 1 : -1
                        });
                    }
                }
            }
        } else if (Type === "Fcc") {
            for (let Ix = 0; Ix < Nx; Ix++) {
                for (let Iy = 0; Iy < Ny; Iy++) {
                    for (let Iz = 0; Iz < Nz; Iz++) {
                        const Fcc = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
                        for (const F of Fcc) {
                            Pts.push({ X: (Ix + F[0]) * S, Y: (Iy + F[1]) * S, Z: (Iz + F[2]) * S, Key: null });
                        }
                    }
                }
            }
        } else if (Type === "Bcc") {
            for (let Ix = 0; Ix < Nx; Ix++) {
                for (let Iy = 0; Iy < Ny; Iy++) {
                    for (let Iz = 0; Iz < Nz; Iz++) {
                        Pts.push({ X: Ix * S, Y: Iy * S, Z: Iz * S, Key: null });
                        Pts.push({ X: (Ix + 0.5) * S, Y: (Iy + 0.5) * S, Z: (Iz + 0.5) * S, Key: null });
                    }
                }
            }
        } else {
            for (let Ix = 0; Ix < Nx; Ix++) {
                for (let Iy = 0; Iy < Ny; Iy++) {
                    for (let Iz = 0; Iz < Nz; Iz++) {
                        Pts.push({ X: Ix * S, Y: Iy * S, Z: Iz * S, Key: null });
                    }
                }
            }
        }

        if (Pts.length) {
            let Cx = 0, Cy = 0, Cz = 0;
            for (const P of Pts) { Cx += P.X; Cy += P.Y; Cz += P.Z; }
            Cx /= Pts.length; Cy /= Pts.length; Cz /= Pts.length;
            for (const P of Pts) { P.X -= Cx; P.Y -= Cy; P.Z -= Cz; }
        }
        return Pts;
    }

    function BuildLattice(Api, State) {
        const Type = State.Type;
        const Preset = Presets[Type];
        if (!Preset) return;

        const Nx = Math.max(1, Math.min(8, State.Nx | 0));
        const Ny = Math.max(1, Math.min(8, State.Ny | 0));
        const Nz = Math.max(1, Math.min(8, State.Nz | 0));
        const Scale = Math.max(40, Math.min(160, Number(State.Scale) || Preset.Scale));
        const Element = State.Element || Preset.Element || "C";
        const Clear = !!State.Clear;

        if (Clear) Api.ClearAtoms();

        const Pts = CellPositions(Type, Nx, Ny, Nz, Scale);
        if (Pts.length > 400) Pts.length = 400;

        const Indices = [];

        for (const P of Pts) {
            const Key = P.Key || Element;
            const AtomObj = Api.SpawnAtom(Key, [P.X, P.Y, P.Z], [0, 0, 0]);
            if (!AtomObj) continue;
            if (Preset.Ionize && P.Charge) AtomObj.ExtraCharge = P.Charge;
            Indices.push(Api.GetAtoms().length - 1);
        }

        const Cut = Scale * (
            Type === "Graphite" ? 0.75 :
            Type === "Diamond" ? 0.5 :
            Type === "NaCl" ? 1.05 :
            Type === "Bcc" ? 0.95 :
            Type === "Fcc" ? 0.78 :
            1.05
        );

        const Atoms = Api.GetAtoms();
        for (let I = 0; I < Indices.length; I++) {
            const Ia = Indices[I];
            const A = Atoms[Ia];
            if (!A) continue;
            for (let J = I + 1; J < Indices.length; J++) {
                const Ib = Indices[J];
                const B = Atoms[Ib];
                if (!B) continue;
                const Dx = B.Position[0] - A.Position[0];
                const Dy = B.Position[1] - A.Position[1];
                const Dz = B.Position[2] - A.Position[2];
                const D = Math.sqrt(Dx * Dx + Dy * Dy + Dz * Dz);
                if (D < Cut) {
                    if (Type === "NaCl") {
                        if ((A.ExtraCharge || 0) * (B.ExtraCharge || 0) >= 0) continue;
                    }
                    if (Type === "Graphite" && Math.abs(Dz) > Scale * 0.3) continue;
                    Api.ForceBond(Ia, Ib);
                }
            }
        }

        Api.SetTemperature(State.Temp ?? 0.08);
        Api.SetFreeEnergy(0);
        Api.Settle(150);

        const R = Api.GetRenderer();
        if (R) {
            const Span = Scale * Math.max(Nx, Ny, Nz) * 0.7 + 80;
            R.BoundaryX = Math.max(R.BoundaryX || 400, Span);
            R.BoundaryY = Math.max(R.BoundaryY || 400, Span);
            R.BoundaryZ = Math.max(R.BoundaryZ || 300, Span);
        }
    }

    function OpenWidget(Api) {
        const State = {
            Type: "Diamond",
            Nx: 2, Ny: 2, Nz: 2,
            Scale: 72,
            Element: "C",
            Clear: true,
            Temp: 0.08
        };

        Api.CreateWidget({
            Id: "lattice-maker",
            Title: "Lattice Maker",
            X: 16,
            Y: 200,
            Width: 290,
            Build(Body) {
                const Structure = Api.AddSection(Body, "Structure", true);
                const TypeRow = document.createElement("div");
                TypeRow.className = "WRow";
                TypeRow.innerHTML = `<label>Type</label>`;
                const TypeSel = document.createElement("select");
                TypeSel.className = "WSelect";
                for (const [Id, P] of Object.entries(Presets)) {
                    const Opt = document.createElement("option");
                    Opt.value = Id;
                    Opt.textContent = P.Label;
                    TypeSel.appendChild(Opt);
                }
                TypeRow.appendChild(TypeSel);
                Structure.appendChild(TypeRow);

                const DescEl = document.createElement("div");
                DescEl.className = "WHint";
                Structure.appendChild(DescEl);

                const ElementRow = document.createElement("div");
                ElementRow.className = "WRow";
                ElementRow.innerHTML = `<label>Element</label>`;
                const ElementInput = document.createElement("input");
                ElementInput.className = "WInput";
                ElementInput.value = "C";
                ElementInput.maxLength = 2;
                ElementRow.appendChild(ElementInput);
                Structure.appendChild(ElementRow);

                const Dims = Api.AddSection(Body, "Cell Repeats", true);
                const DimRow = document.createElement("div");
                DimRow.className = "WRow3";
                const NxLabel = document.createElement("label");
                NxLabel.innerHTML = `Nx`;
                const NxInput = document.createElement("input");
                NxInput.type = "number";
                NxInput.className = "WNum";
                NxInput.min = "1";
                NxInput.max = "8";
                NxInput.value = "2";
                NxLabel.appendChild(NxInput);
                const NyLabel = document.createElement("label");
                NyLabel.innerHTML = `Ny`;
                const NyInput = document.createElement("input");
                NyInput.type = "number";
                NyInput.className = "WNum";
                NyInput.min = "1";
                NyInput.max = "8";
                NyInput.value = "2";
                NyLabel.appendChild(NyInput);
                const NzLabel = document.createElement("label");
                NzLabel.innerHTML = `Nz`;
                const NzInput = document.createElement("input");
                NzInput.type = "number";
                NzInput.className = "WNum";
                NzInput.min = "1";
                NzInput.max = "8";
                NzInput.value = "2";
                NzLabel.appendChild(NzInput);
                DimRow.appendChild(NxLabel);
                DimRow.appendChild(NyLabel);
                DimRow.appendChild(NzLabel);
                Dims.appendChild(DimRow);

                const ScaleRow = document.createElement("div");
                ScaleRow.className = "WRow";
                ScaleRow.innerHTML = `<label>Scale</label>`;
                const ScaleInput = document.createElement("input");
                ScaleInput.type = "range";
                ScaleInput.className = "WRange";
                ScaleInput.min = "45";
                ScaleInput.max = "140";
                ScaleInput.value = "72";
                const ScaleVal = document.createElement("span");
                ScaleVal.className = "WHint";
                ScaleVal.style.minWidth = "34px";
                ScaleVal.style.textAlign = "right";
                ScaleVal.textContent = "72";
                ScaleRow.appendChild(ScaleInput);
                ScaleRow.appendChild(ScaleVal);
                Dims.appendChild(ScaleRow);

                const Env = Api.AddSection(Body, "Environment", false);
                const TempRow = document.createElement("div");
                TempRow.className = "WRow";
                TempRow.innerHTML = `<label>Bath T</label>`;
                const TempInput = document.createElement("input");
                TempInput.type = "range";
                TempInput.className = "WRange";
                TempInput.min = "0";
                TempInput.max = "0.8";
                TempInput.step = "0.02";
                TempInput.value = "0.08";
                const TempVal = document.createElement("span");
                TempVal.className = "WHint";
                TempVal.style.minWidth = "34px";
                TempVal.style.textAlign = "right";
                TempVal.textContent = "0.08";
                TempRow.appendChild(TempInput);
                TempRow.appendChild(TempVal);
                Env.appendChild(TempRow);

                const ClearRow = document.createElement("div");
                ClearRow.className = "WRow";
                const ClearLabel = document.createElement("label");
                ClearLabel.className = "WCheck";
                const ClearInput = document.createElement("input");
                ClearInput.type = "checkbox";
                ClearInput.checked = true;
                ClearLabel.appendChild(ClearInput);
                ClearLabel.appendChild(document.createTextNode("Clear existing atoms"));
                ClearRow.appendChild(ClearLabel);
                Env.appendChild(ClearRow);

                const Action = Api.AddSection(Body, "Build", true);
                const Hint = document.createElement("div");
                Hint.className = "WHint";
                Hint.textContent = "Keep Nx Ny Nz small (<= ~3^3) for performance.";
                Action.appendChild(Hint);
                const BuildRow = document.createElement("div");
                BuildRow.className = "WActions";
                const BuildBtn = document.createElement("button");
                BuildBtn.className = "WPrimary";
                BuildBtn.textContent = "Build lattice";
                BuildRow.appendChild(BuildBtn);
                Action.appendChild(BuildRow);

                const SyncDesc = () => {
                    const P = Presets[TypeSel.value];
                    DescEl.textContent = P?.Desc || "";
                    if (P?.Element) ElementInput.value = P.Element;
                    if (P?.Scale) {
                        ScaleInput.value = String(P.Scale);
                        ScaleVal.textContent = String(P.Scale);
                    }
                    ElementInput.disabled = TypeSel.value === "NaCl";
                };
                TypeSel.addEventListener("change", SyncDesc);
                SyncDesc();

                ScaleInput.addEventListener("input", () => { ScaleVal.textContent = ScaleInput.value; });
                TempInput.addEventListener("input", () => {
                    TempVal.textContent = Number(TempInput.value).toFixed(2);
                });

                BuildBtn.addEventListener("click", () => {
                    State.Type = TypeSel.value;
                    State.Nx = Number(NxInput.value) || 2;
                    State.Ny = Number(NyInput.value) || 2;
                    State.Nz = Number(NzInput.value) || 2;
                    State.Scale = Number(ScaleInput.value) || 72;
                    State.Element = ElementInput.value.trim() || "C";
                    State.Clear = ClearInput.checked;
                    State.Temp = Number(TempInput.value) || 0.08;
                    BuildLattice(Api, State);
                });
            }
        });
    }

    const Entry = {
        Id: "lattice-maker",
        Name: "Lattice Maker",
        Version: "1.2.0",
        Description: "Build diamond, graphite, NaCl, FCC, BCC, and cubic lattices",
        Setup(Api) {
            Api.On("OpenPlugin", ({ Id }) => {
                if (Id === "lattice-maker") OpenWidget(Api);
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