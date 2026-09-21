(function LatticeMakerPlugin() {
    const Presets = {
        Diamond: {
            Label: "Diamond (C)",
            Desc: "Tetrahedral carbon lattice",
            Element: "C",
            Scale: 72,
            Ionize: false
        },
        Graphite: {
            Label: "Graphite (C)",
            Desc: "Hexagonal carbon sheets",
            Element: "C",
            Scale: 70,
            Ionize: false
        },
        NaCl: {
            Label: "Rock salt (NaCl)",
            Desc: "FCC ionic lattice",
            Element: null,
            Scale: 95,
            Ionize: true
        },
        Fcc: {
            Label: "FCC metal",
            Desc: "Face-centered cubic",
            Element: "Cu",
            Scale: 85,
            Ionize: false
        },
        Bcc: {
            Label: "BCC metal",
            Desc: "Body-centered cubic",
            Element: "Fe",
            Scale: 90,
            Ionize: false
        },
        Sc: {
            Label: "Simple cubic",
            Desc: "Primitive cubic cell",
            Element: "Po",
            Scale: 100,
            Ionize: false
        }
    };

    function CellPositions(Type, Nx, Ny, Nz, Scale) {
        const Pts = [];
        const S = Scale;

        if (Type === "Diamond") {
            const Basis = [[0, 0, 0], [0.25, 0.25, 0.25]];
            for (let Ix = 0; Ix < Nx; Ix++) {
                for (let Iy = 0; Iy < Ny; Iy++) {
                    for (let Iz = 0; Iz < Nz; Iz++) {
                        const Fcc = [
                            [0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]
                        ];
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
                        Pts.push({
                            X: X0 + A * 0.5,
                            Y: Y0 + A * Math.sqrt(3) / 6,
                            Z: Z0,
                            Key: "C"
                        });
                    }
                }
            }
        } else if (Type === "NaCl") {
            for (let Ix = 0; Ix < Nx; Ix++) {
                for (let Iy = 0; Iy < Ny; Iy++) {
                    for (let Iz = 0; Iz < Nz; Iz++) {
                        const Even = (Ix + Iy + Iz) % 2 === 0;
                        Pts.push({
                            X: Ix * S,
                            Y: Iy * S,
                            Z: Iz * S,
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
                        const Fcc = [
                            [0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]
                        ];
                        for (const F of Fcc) {
                            Pts.push({
                                X: (Ix + F[0]) * S,
                                Y: (Iy + F[1]) * S,
                                Z: (Iz + F[2]) * S,
                                Key: null
                            });
                        }
                    }
                }
            }
        } else if (Type === "Bcc") {
            for (let Ix = 0; Ix < Nx; Ix++) {
                for (let Iy = 0; Iy < Ny; Iy++) {
                    for (let Iz = 0; Iz < Nz; Iz++) {
                        Pts.push({ X: Ix * S, Y: Iy * S, Z: Iz * S, Key: null });
                        Pts.push({
                            X: (Ix + 0.5) * S,
                            Y: (Iy + 0.5) * S,
                            Z: (Iz + 0.5) * S,
                            Key: null
                        });
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
            if (Preset.Ionize && P.Charge) {
                AtomObj.ExtraCharge = P.Charge;
            }
            Indices.push(Api.GetAtoms().length - 1);
        }

        const Cut = Scale * (Type === "Graphite" ? 0.72 : Type === "Diamond" ? 0.48 : Type === "NaCl" ? 0.75 : 0.78);
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
            Width: 280,
            Build(Body) {
                Body.innerHTML = `
                    <div class="WRow"><label>Structure</label>
                        <select id="LmType" class="WSelect"></select>
                    </div>
                    <div class="WHint" id="LmDesc"></div>
                    <div class="WRow"><label>Element</label>
                        <input id="LmElement" class="WInput" value="C" maxlength="2">
                    </div>
                    <div class="WRow3">
                        <label>Nx <input id="LmNx" type="number" min="1" max="6" value="2" class="WNum"></label>
                        <label>Ny <input id="LmNy" type="number" min="1" max="6" value="2" class="WNum"></label>
                        <label>Nz <input id="LmNz" type="number" min="1" max="6" value="2" class="WNum"></label>
                    </div>
                    <div class="WRow"><label>Scale</label>
                        <input id="LmScale" type="range" min="45" max="140" value="72" class="WRange">
                        <span id="LmScaleVal">72</span>
                    </div>
                    <div class="WRow"><label>Bath T</label>
                        <input id="LmTemp" type="range" min="0" max="0.8" step="0.02" value="0.08" class="WRange">
                        <span id="LmTempVal">0.08</span>
                    </div>
                    <div class="WRow">
                        <label class="WCheck"><input id="LmClear" type="checkbox" checked> Clear existing atoms</label>
                    </div>
                    <div class="WActions">
                        <button id="LmBuild" class="WPrimary">Build lattice</button>
                    </div>
                    <div class="WHint">Keep Nx·Ny·Nz small (≤ ~3³) for performance.</div>
                `;

                const TypeSel = Body.querySelector("#LmType");
                for (const [Id, P] of Object.entries(Presets)) {
                    const Opt = document.createElement("option");
                    Opt.value = Id;
                    Opt.textContent = P.Label;
                    TypeSel.appendChild(Opt);
                }

                const SyncDesc = () => {
                    const P = Presets[TypeSel.value];
                    Body.querySelector("#LmDesc").textContent = P?.Desc || "";
                    if (P?.Element) Body.querySelector("#LmElement").value = P.Element;
                    if (P?.Scale) {
                        Body.querySelector("#LmScale").value = String(P.Scale);
                        Body.querySelector("#LmScaleVal").textContent = String(P.Scale);
                    }
                    Body.querySelector("#LmElement").disabled = TypeSel.value === "NaCl";
                };
                TypeSel.addEventListener("change", SyncDesc);
                SyncDesc();

                Body.querySelector("#LmScale").addEventListener("input", (E) => {
                    Body.querySelector("#LmScaleVal").textContent = E.target.value;
                });
                Body.querySelector("#LmTemp").addEventListener("input", (E) => {
                    Body.querySelector("#LmTempVal").textContent = Number(E.target.value).toFixed(2);
                });

                Body.querySelector("#LmBuild").addEventListener("click", () => {
                    State.Type = TypeSel.value;
                    State.Nx = Number(Body.querySelector("#LmNx").value) || 2;
                    State.Ny = Number(Body.querySelector("#LmNy").value) || 2;
                    State.Nz = Number(Body.querySelector("#LmNz").value) || 2;
                    State.Scale = Number(Body.querySelector("#LmScale").value) || 72;
                    State.Element = Body.querySelector("#LmElement").value.trim() || "C";
                    State.Clear = Body.querySelector("#LmClear").checked;
                    State.Temp = Number(Body.querySelector("#LmTemp").value) || 0.08;
                    BuildLattice(Api, State);
                });
            }
        });
    }

    const Entry = {
        Id: "lattice-maker",
        Name: "Lattice Maker",
        Version: "1.0.0",
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