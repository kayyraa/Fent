(function MoleculeSketcherPlugin() {
    function OpenWidget(Api) {
        const State = {
            LastSig: "",
            LastMol: null,
            EmptyShown: false
        };

        Api.CreateWidget({
            Id: "molecule-sketcher",
            Title: "Molecule Sketcher",
            X: 300,
            Y: 380,
            Width: 340,
            Build(Body) {
                const Info = Api.AddSection(Body, "Selected Molecule", true);
                const FormulaVal = Api.AddStatRow(Info, "Formula");
                const CountVal = Api.AddStatRow(Info, "Atoms");
                const BondVal = Api.AddStatRow(Info, "Bonds");
                const TypeVal = Api.AddStatRow(Info, "Bond types");
                const ChargeVal = Api.AddStatRow(Info, "Net charge");

                const ViewSection = Api.AddSection(Body, "Skeletal Diagram", true);
                const Canvas = document.createElement("canvas");
                Canvas.className = "WGraph";
                Canvas.width = 640;
                Canvas.height = 400;
                Canvas.style.height = "250px";
                ViewSection.appendChild(Canvas);
                const Ctx = Canvas.getContext("2d");

                const Hint = document.createElement("div");
                Hint.className = "WHint";
                Hint.textContent = "Select an atom to see its whole molecule as a skeletal diagram. The molecule is also outlined in the scene.";
                ViewSection.appendChild(Hint);

                function GetMolecule(Atom) {
                    const Objects = Api.GetAtoms();
                    const R = Api.GetRenderer();
                    if (!R || !R.ActiveBondPairs) return { Atoms: [Atom], Bonds: [], Objects };
                    const Idx = Objects.indexOf(Atom);
                    if (Idx < 0) return { Atoms: [Atom], Bonds: [], Objects };
                    const Neighbors = new Map();
                    for (const Key of R.ActiveBondPairs) {
                        const [A, B] = Key.split("_").map(Number);
                        if (!Neighbors.has(A)) Neighbors.set(A, []);
                        if (!Neighbors.has(B)) Neighbors.set(B, []);
                        Neighbors.get(A).push(B);
                        Neighbors.get(B).push(A);
                    }
                    const Visited = new Set();
                    const Queue = [Idx];
                    Visited.add(Idx);
                    while (Queue.length) {
                        const Cur = Queue.shift();
                        const Ns = Neighbors.get(Cur) || [];
                        for (const N of Ns) if (!Visited.has(N)) { Visited.add(N); Queue.push(N); }
                    }
                    const Atoms = [...Visited].map((i) => Objects[i]).filter(Boolean);
                    const Bonds = [];
                    for (const Key of R.ActiveBondPairs) {
                        const [A, B] = Key.split("_").map(Number);
                        if (Visited.has(A) && Visited.has(B)) {
                            const D = R.BondData.get(Key);
                            if (D) Bonds.push({ A: Objects[A], B: Objects[B], Order: D.order || 1, Type: D.BondType || "covalent" });
                        }
                    }
                    return { Atoms, Bonds, Objects };
                }

                function Layout(Mol) {
                    const N = Mol.Atoms.length;
                    const Pos = new Map();
                    let Seed = 12345;
                    const Rand = () => {
                        Seed = (Seed * 9301 + 49297) % 233280;
                        return Seed / 233280;
                    };
                    for (let i = 0; i < N; i++) {
                        const A = Math.PI * 2 * (i / N) + (Rand() - 0.5) * 0.2;
                        Pos.set(Mol.Atoms[i], { x: Math.cos(A), y: Math.sin(A) });
                    }
                    if (N === 1) Pos.set(Mol.Atoms[0], { x: 0, y: 0 });
                    const Iterations = Math.min(260, 60 + N * 8);
                    for (let It = 0; It < Iterations; It++) {
                        const Forces = new Map();
                        for (const A of Mol.Atoms) Forces.set(A, { x: 0, y: 0 });
                        for (let i = 0; i < N; i++) {
                            for (let j = i + 1; j < N; j++) {
                                const A = Mol.Atoms[i], B = Mol.Atoms[j];
                                const Pa = Pos.get(A), Pb = Pos.get(B);
                                let Dx = Pb.x - Pa.x, Dy = Pb.y - Pa.y;
                                const D2 = Dx * Dx + Dy * Dy + 0.01;
                                const D = Math.sqrt(D2);
                                Dx /= D; Dy /= D;
                                const F = 0.22 / D2;
                                const Fa = Forces.get(A), Fb = Forces.get(B);
                                Fa.x -= Dx * F; Fa.y -= Dy * F;
                                Fb.x += Dx * F; Fb.y += Dy * F;
                            }
                        }
                        for (const Bd of Mol.Bonds) {
                            const Pa = Pos.get(Bd.A), Pb = Pos.get(Bd.B);
                            const Dx = Pb.x - Pa.x, Dy = Pb.y - Pa.y;
                            const D = Math.sqrt(Dx * Dx + Dy * Dy) + 0.001;
                            const Rest = 1.0;
                            const F = (D - Rest) * 0.35;
                            const Ux = Dx / D, Uy = Dy / D;
                            const Fa = Forces.get(Bd.A), Fb = Forces.get(Bd.B);
                            Fa.x += Ux * F; Fa.y += Uy * F;
                            Fb.x -= Ux * F; Fb.y -= Uy * F;
                        }
                        for (const A of Mol.Atoms) {
                            const P = Pos.get(A);
                            const F = Forces.get(A);
                            F.x -= P.x * 0.03;
                            F.y -= P.y * 0.03;
                        }
                        for (const A of Mol.Atoms) {
                            const P = Pos.get(A), F = Forces.get(A);
                            P.x += Math.max(-0.08, Math.min(0.08, F.x));
                            P.y += Math.max(-0.08, Math.min(0.08, F.y));
                        }
                    }
                    return Pos;
                }

                function Draw(Mol) {
                    const W = Canvas.width, H = Canvas.height;
                    Ctx.clearRect(0, 0, W, H);

                    if (!Mol || Mol.Atoms.length === 0) {
                        Ctx.fillStyle = "rgba(255,255,255,0.2)";
                        Ctx.font = "20px 'Cascadia Mono', monospace";
                        Ctx.textAlign = "center";
                        Ctx.textBaseline = "middle";
                        Ctx.fillText("Select an atom", W / 2, H / 2);
                        return;
                    }

                    const Pos = Layout(Mol);

                    let MinX = Infinity, MaxX = -Infinity, MinY = Infinity, MaxY = -Infinity;
                    for (const A of Mol.Atoms) {
                        const P = Pos.get(A);
                        if (P.x < MinX) MinX = P.x;
                        if (P.x > MaxX) MaxX = P.x;
                        if (P.y < MinY) MinY = P.y;
                        if (P.y > MaxY) MaxY = P.y;
                    }
                    const Pad = 60;
                    const RangeX = Math.max(0.001, MaxX - MinX);
                    const RangeY = Math.max(0.001, MaxY - MinY);
                    const ScaleX = (W - Pad * 2) / RangeX;
                    const ScaleY = (H - Pad * 2) / RangeY;
                    const Scale = Math.min(ScaleX, ScaleY, 220);
                    const Cx = (MinX + MaxX) / 2, Cy = (MinY + MaxY) / 2;
                    const Project = (P) => ({
                        x: W / 2 + (P.x - Cx) * Scale,
                        y: H / 2 - (P.y - Cy) * Scale
                    });

                    const HaloColor = "rgba(10, 132, 255, 0.10)";
                    for (const A of Mol.Atoms) {
                        const P = Project(Pos.get(A));
                        Ctx.fillStyle = HaloColor;
                        Ctx.beginPath();
                        Ctx.arc(P.x, P.y, 30, 0, Math.PI * 2);
                        Ctx.fill();
                    }

                    for (const Bd of Mol.Bonds) {
                        const Pa = Project(Pos.get(Bd.A));
                        const Pb = Project(Pos.get(Bd.B));
                        const Dx = Pb.x - Pa.x, Dy = Pb.y - Pa.y;
                        const D = Math.sqrt(Dx * Dx + Dy * Dy) + 0.001;
                        const Ux = Dx / D, Uy = Dy / D;
                        const Nx = -Uy * 5, Ny = Ux * 5;

                        let Color = "rgba(230,230,230,0.92)";
                        if (Bd.Type === "ionic") Color = "rgba(255,170,80,0.92)";
                        else if (Bd.Type === "metallic") Color = "rgba(140,200,255,0.92)";
                        Ctx.strokeStyle = Color;
                        Ctx.lineWidth = 2.2;
                        Ctx.lineCap = "round";

                        if (Bd.Order === 1) {
                            Ctx.beginPath();
                            Ctx.moveTo(Pa.x, Pa.y);
                            Ctx.lineTo(Pb.x, Pb.y);
                            Ctx.stroke();
                        } else if (Bd.Order === 2) {
                            Ctx.beginPath();
                            Ctx.moveTo(Pa.x + Nx * 0.5, Pa.y + Ny * 0.5);
                            Ctx.lineTo(Pb.x + Nx * 0.5, Pb.y + Ny * 0.5);
                            Ctx.stroke();
                            Ctx.beginPath();
                            Ctx.moveTo(Pa.x - Nx * 0.5, Pa.y - Ny * 0.5);
                            Ctx.lineTo(Pb.x - Nx * 0.5, Pb.y - Ny * 0.5);
                            Ctx.stroke();
                        } else {
                            Ctx.beginPath();
                            Ctx.moveTo(Pa.x, Pa.y);
                            Ctx.lineTo(Pb.x, Pb.y);
                            Ctx.stroke();
                            Ctx.beginPath();
                            Ctx.moveTo(Pa.x + Nx * 0.85, Pa.y + Ny * 0.85);
                            Ctx.lineTo(Pb.x + Nx * 0.85, Pb.y + Ny * 0.85);
                            Ctx.stroke();
                            Ctx.beginPath();
                            Ctx.moveTo(Pa.x - Nx * 0.85, Pa.y - Ny * 0.85);
                            Ctx.lineTo(Pb.x - Nx * 0.85, Pb.y - Ny * 0.85);
                            Ctx.stroke();
                        }
                    }

                    Ctx.font = "bold 16px 'Cascadia Mono', monospace";
                    Ctx.textAlign = "center";
                    Ctx.textBaseline = "middle";

                    for (const A of Mol.Atoms) {
                        const P = Project(Pos.get(A));
                        const IsCarbon = A.Key === "C";
                        const IsHydrogen = A.Key === "H";

                        if (IsHydrogen) continue;

                        if (IsCarbon) {
                            Ctx.fillStyle = "rgba(215,215,215,0.9)";
                            Ctx.beginPath();
                            Ctx.arc(P.x, P.y, 3.5, 0, Math.PI * 2);
                            Ctx.fill();
                        } else {
                            const Color = A.AtomColor || [0.7, 0.7, 0.7];
                            const R = Math.round(Color[0] * 220);
                            const G = Math.round(Color[1] * 220);
                            const B = Math.round(Color[2] * 220);
                            Ctx.fillStyle = `rgb(${R},${G},${B})`;
                            Ctx.beginPath();
                            Ctx.arc(P.x, P.y, 15, 0, Math.PI * 2);
                            Ctx.fill();
                            Ctx.strokeStyle = "rgba(0,0,0,0.45)";
                            Ctx.lineWidth = 1;
                            Ctx.stroke();
                            Ctx.fillStyle = "#0b0b0e";
                            Ctx.fillText(A.Key, P.x, P.y + 1);
                        }
                    }

                    const Charge = Mol.Atoms.reduce((S, A) => S + (A.ExtraCharge || 0), 0);
                    if (Math.abs(Charge) > 0.05) {
                        Ctx.font = "13px 'Cascadia Mono', monospace";
                        Ctx.fillStyle = "rgba(255,255,255,0.55)";
                        Ctx.textAlign = "right";
                        Ctx.textBaseline = "top";
                        Ctx.fillText(
                            `net ${Charge > 0 ? "+" : ""}${Charge.toFixed(2)}e`,
                            W - 8, 8
                        );
                    }
                }

                function Refresh() {
                    const Atom = Api.GetSelectedAtom();
                    if (!Atom) {
                        if (!State.EmptyShown) {
                            State.EmptyShown = true;
                            State.LastSig = "";
                            State.LastMol = null;
                            FormulaVal.textContent = "-";
                            CountVal.textContent = "-";
                            BondVal.textContent = "-";
                            TypeVal.textContent = "-";
                            ChargeVal.textContent = "-";
                            Draw(null);
                        }
                        return;
                    }
                    State.EmptyShown = false;

                    const Mol = GetMolecule(Atom);
                    const Sig = Mol.Atoms.map((A) => Mol.Objects.indexOf(A)).sort((a, b) => a - b).join(",")
                        + "|" + Mol.Bonds.map((Bd) => `${Mol.Objects.indexOf(Bd.A)}-${Mol.Objects.indexOf(Bd.B)}:${Bd.Order}`).join(",")
                        + "|" + Mol.Atoms.map((A) => (A.ExtraCharge || 0).toFixed(2)).join(",");

                    if (Sig === State.LastSig) return;
                    State.LastSig = Sig;
                    State.LastMol = Mol;

                    const Formula = {};
                    let NetCharge = 0;
                    for (const A of Mol.Atoms) {
                        Formula[A.Key] = (Formula[A.Key] || 0) + 1;
                        NetCharge += A.ExtraCharge || 0;
                    }
                    const FormulaStr = Object.entries(Formula)
                        .sort((a, b) => {
                            if (a[0] === "C") return -1;
                            if (b[0] === "C") return 1;
                            if (a[0] === "H") return -1;
                            if (b[0] === "H") return 1;
                            return a[0].localeCompare(b[0]);
                        })
                        .map(([K, V]) => V > 1 ? `${K}${V}` : K)
                        .join("");

                    const BondTypes = new Set();
                    for (const Bd of Mol.Bonds) {
                        const K = Bd.Type || "covalent";
                        BondTypes.add(K);
                    }

                    FormulaVal.textContent = FormulaStr || "-";
                    CountVal.textContent = String(Mol.Atoms.length);
                    BondVal.textContent = String(Mol.Bonds.length);
                    TypeVal.textContent = BondTypes.size ? [...BondTypes].join(", ") : "-";
                    ChargeVal.textContent = Math.abs(NetCharge) > 0.05
                        ? `${NetCharge > 0 ? "+" : ""}${NetCharge.toFixed(2)}e`
                        : "0";

                    Draw(Mol);
                }

                Api.On("Tick", Refresh);
                Refresh();
            }
        });
    }

    const Entry = {
        Id: "molecule-sketcher",
        Name: "Molecule Sketcher",
        Version: "1.0.0",
        Description: "Skeletal diagram of the molecule containing the selected atom",
        Setup(Api) {
            Api.On("OpenPlugin", ({ Id }) => {
                if (Id === "molecule-sketcher") OpenWidget(Api);
            });
        },
        Open(Api) { OpenWidget(Api); }
    };

    if (globalThis.Plugin) globalThis.Plugin.Register(Entry);
    else {
        globalThis.FentPlugins = globalThis.FentPlugins || [];
        globalThis.FentPlugins.push(Entry);
    }
})();