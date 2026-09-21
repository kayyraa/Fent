const Canvas = document.querySelector(".Canvas");
const CanvasRenderer = new Renderer(Canvas);
globalThis.CanvasRenderer = CanvasRenderer;

const FramerateLabel = document.querySelector(".Framerate");
const DeltaTimeLabel = document.querySelector(".DeltaTime");
const TimeScaleLabel = document.querySelector(".TimeScale");
const TemperatureLabel = document.querySelector(".Temperature");
const BathTempLabel = document.querySelector(".BathTemp");
const BoundsSizeLabel = document.querySelector(".BoundsSize");
const Tooltip = document.querySelector(".Tooltip");
const ContextMenu = document.getElementById("ContextMenu");
let ContextTarget = null;

const ResizeCanvas = () => {
    CanvasRenderer.Resize();
};
ResizeCanvas();
window.addEventListener("resize", ResizeCanvas);

const KeyStates = {};
const CameraVelocity = [0, 0, 0];
const CameraAcceleration = 0.375;
const CameraDamping = 0.975;

let TargetYaw = -Math.PI / 2;
let TargetPitch = 0;
let CurrentYaw = -Math.PI / 2;
let CurrentPitch = 0;
let IsRmbDown = false;

let SelectedObject = null;
let HoveredObject = null;
let IsInteracting = false;
let DragPlanePoint = [0, 0, 0];
let DragPlaneNormal = [0, 0, 1];
let InitialHitOffset = [0, 0, 0];

let LastDragPosition = [0, 0, 0];
let LastDragTime = performance.now();
let ThrowVelocity = [0, 0, 0];
let DragSamples = [];
const DragSampleWindowMs = 60;

window.addEventListener("contextmenu", (Event) => Event.preventDefault());

function HideContextMenu() {
    if (ContextMenu) ContextMenu.hidden = true;
    ContextTarget = null;
}

function ShowContextMenu(Atom, X, Y) {
    if (!ContextMenu || !Atom) return;
    ContextTarget = Atom;
    SelectedObject = Atom;
    CanvasRenderer.SelectedObject = Atom;
    const Title = ContextMenu.querySelector(".CtxTitle");
    if (Title) {
        const A = Atom.Atom;
        const MassNumber = (Atom.Protons || 0) + (Atom.Neutrons || 0);
        Title.textContent = `${Atom.Key} | ${A.Name || Atom.Key} | A=${MassNumber}`;
    }
    ContextMenu.hidden = false;
    const MenuW = ContextMenu.offsetWidth || 180;
    const MenuH = ContextMenu.offsetHeight || 280;
    let Left = X + 4;
    let Top = Y + 4;
    if (Left + MenuW > window.innerWidth) Left = X - MenuW - 4;
    if (Top + MenuH > window.innerHeight) Top = Y - MenuH - 4;
    ContextMenu.style.left = `${Math.max(4, Left)}px`;
    ContextMenu.style.top = `${Math.max(4, Top)}px`;
}

window.addEventListener("mousedown", (Event) => {
    const ClickedInsideMenu = ContextMenu && !ContextMenu.hidden && ContextMenu.contains(Event.target);
    const ClickedUi = Event.target.closest(".Area, .ContextMenu, .Tooltip, button, select, input, label");

    if (ClickedInsideMenu || ClickedUi) {
        if (!ClickedInsideMenu && ContextMenu && !ContextMenu.hidden) {
            HideContextMenu();
        }
        return;
    }

    if (ContextMenu && !ContextMenu.hidden) {
        HideContextMenu();
    }

    if (Event.button === 2) {
        const MousePos = { x: Event.clientX, y: Event.clientY };
        const Ray = GetScreenRay(MousePos.x, MousePos.y);
        const AtomHit = PickAtom(Ray);

        if (AtomHit) {
            ShowContextMenu(AtomHit, MousePos.x, MousePos.y);
            IsRmbDown = false;
            return;
        }

        IsRmbDown = true;
        return;
    }

    if (Event.button === 0) {
        const MousePos = { x: Event.clientX, y: Event.clientY };
        const Ray = GetScreenRay(MousePos.x, MousePos.y);

        const AtomHit = PickAtom(Ray);
        if (AtomHit) {
            SelectedObject = AtomHit;
            CanvasRenderer.SelectedObject = SelectedObject;
            IsInteracting = true;

            const Forward = GetCameraForward();
            DragPlaneNormal = [-Forward[0], -Forward[1], -Forward[2]];
            DragPlanePoint = [...SelectedObject.Position];

            const Intersection = RayPlaneIntersection(Ray.Origin, Ray.Direction, DragPlanePoint, DragPlaneNormal);
            if (Intersection) {
                InitialHitOffset = [
                    SelectedObject.Position[0] - Intersection[0],
                    SelectedObject.Position[1] - Intersection[1],
                    SelectedObject.Position[2] - Intersection[2]
                ];
                LastDragPosition = [
                    Intersection[0] + InitialHitOffset[0],
                    Intersection[1] + InitialHitOffset[1],
                    Intersection[2] + InitialHitOffset[2]
                ];
                LastDragTime = performance.now();
                ThrowVelocity = [0, 0, 0];
                DragSamples = [{ t: LastDragTime, p: [...LastDragPosition] }];
            }
        } else {
            SelectedObject = null;
            CanvasRenderer.SelectedObject = null;
        }
    }
});

function ComputeThrowFromSamples() {
    if (DragSamples.length < 2) return [0, 0, 0];
    const Now = DragSamples[DragSamples.length - 1].t;
    const Recent = DragSamples.filter((S) => Now - S.t <= DragSampleWindowMs);
    if (Recent.length < 2) {
        return [0, 0, 0];
    }
    const First = Recent[0];
    const Last = Recent[Recent.length - 1];
    const Dt = Math.max(0.008, (Last.t - First.t) / 1000);
    const Scale = 0.085;
    return [
        (Last.p[0] - First.p[0]) / Dt * Scale,
        (Last.p[1] - First.p[1]) / Dt * Scale,
        (Last.p[2] - First.p[2]) / Dt * Scale
    ];
}

window.addEventListener("mouseup", (Event) => {
    if (Event.button === 2) IsRmbDown = false;
    if (Event.button === 0) {
        if (IsInteracting && SelectedObject) {
            ThrowVelocity = ComputeThrowFromSamples();
            const Mag = Math.sqrt(
                ThrowVelocity[0] * ThrowVelocity[0] +
                ThrowVelocity[1] * ThrowVelocity[1] +
                ThrowVelocity[2] * ThrowVelocity[2]
            );
            if (Mag < 0.35) ThrowVelocity = [0, 0, 0];
            SelectedObject.Velocity = [...ThrowVelocity];
        }
        IsInteracting = false;
        DragSamples = [];
    }
});

window.addEventListener("mousemove", (Event) => {
    const MousePos = { x: Event.clientX, y: Event.clientY };

    if (IsRmbDown) {
        const Sensitivity = 0.002;
        TargetYaw += Event.movementX * Sensitivity;
        TargetPitch -= Event.movementY * Sensitivity;
        const PitchLimit = Math.PI / 2 - 0.01;
        TargetPitch = Math.max(-PitchLimit, Math.min(PitchLimit, TargetPitch));
    }

    const Ray = GetScreenRay(MousePos.x, MousePos.y);

    if (IsInteracting && SelectedObject) {
        if (Tooltip) Tooltip.style.opacity = "0";
        const Intersection = RayPlaneIntersection(Ray.Origin, Ray.Direction, DragPlanePoint, DragPlaneNormal);
        if (Intersection) {
            const CurrentTime = performance.now();

            const NewPos = [
                Intersection[0] + InitialHitOffset[0],
                Intersection[1] + InitialHitOffset[1],
                Intersection[2] + InitialHitOffset[2]
            ];

            DragSamples.push({ t: CurrentTime, p: [...NewPos] });
            while (DragSamples.length > 0 && CurrentTime - DragSamples[0].t > DragSampleWindowMs * 2) {
                DragSamples.shift();
            }

            SelectedObject.Position[0] = NewPos[0];
            SelectedObject.Position[1] = NewPos[1];
            SelectedObject.Position[2] = NewPos[2];
            SelectedObject.Velocity = [0, 0, 0];

            LastDragPosition = NewPos;
            LastDragTime = CurrentTime;
        }
    } else {
        HoveredObject = PickAtom(Ray);
        CanvasRenderer.HoveredObject = HoveredObject;

        if (HoveredObject && Tooltip) {
            const A = HoveredObject.Atom;
            const Z = HoveredObject.Protons || A.AtomicNumber || 0;
            const N = HoveredObject.Neutrons || 0;
            const MassNumber = Z + N;
            let Text = `${HoveredObject.Key} | ${A.Name || HoveredObject.Key} | Z=${Z} N=${N} A=${MassNumber}`;
            if (!HoveredObject.Stable) Text += ` | UNSTABLE`;
            if (HoveredObject.PartialCharge !== undefined && Math.abs(HoveredObject.PartialCharge) > 0.02) {
                Text += ` | q${HoveredObject.PartialCharge > 0 ? "+" : ""}${HoveredObject.PartialCharge.toFixed(2)}`;
            }
            if (HoveredObject.Excited > 0.05) {
                Text += ` | *${HoveredObject.Excited.toFixed(1)}`;
            }
            Tooltip.textContent = Text;
            Tooltip.style.opacity = "1";
            Tooltip.style.left = `${MousePos.x + 14}px`;
            Tooltip.style.top = `${MousePos.y + 14}px`;
        } else if (Tooltip) {
            Tooltip.style.opacity = "0";
        }
    }
});

window.addEventListener("keydown", (Event) => {
    KeyStates[Event.code] = true;
    if (Event.code === "Escape") HideContextMenu();
});

window.addEventListener("keyup", (Event) => {
    KeyStates[Event.code] = false;
});

document.querySelectorAll(".ModeBtn").forEach((Btn) => {
    Btn.addEventListener("click", () => {
        const Mode = Btn.dataset.mode;
        CanvasRenderer.DisplayMode = Mode;
        document.querySelectorAll(".ModeBtn").forEach((B) => B.classList.toggle("active", B === Btn));
    });
});

if (ContextMenu) {
    ContextMenu.addEventListener("mousedown", (Event) => {
        Event.preventDefault();
        Event.stopPropagation();

        const Btn = Event.target.closest("button[data-action]");
        if (!Btn || !ContextTarget) return;
        if (Event.button !== 0) return;

        const Action = Btn.dataset.action;
        const Atom = ContextTarget;

        switch (Action) {
            case "excite":
                Atom.Excited = Math.min(3, (Atom.Excited || 0) + Prefs.ExciteAmount);
                Atom.Velocity[0] += (Math.random() - 0.5) * Prefs.ExciteAmount * 3;
                Atom.Velocity[1] += (Math.random() - 0.5) * Prefs.ExciteAmount * 3;
                Atom.Velocity[2] += (Math.random() - 0.5) * Prefs.ExciteAmount * 3;
                break;
            case "deexcite":
                Atom.Excited = 0;
                Atom.Velocity[0] *= 0.3;
                Atom.Velocity[1] *= 0.3;
                Atom.Velocity[2] *= 0.3;
                break;
            case "impulse": {
                const Dir = GetCameraForward();
                const Imp = Prefs.ImpulseStrength;
                Atom.Velocity[0] += Dir[0] * Imp;
                Atom.Velocity[1] += Dir[1] * Imp;
                Atom.Velocity[2] += Dir[2] * Imp;
                break;
            }
            case "heat":
                Atom.Excited = Math.min(3, (Atom.Excited || 0) + Prefs.ExciteAmount * 0.5);
                CanvasRenderer.Temperature = Math.min(2, CanvasRenderer.Temperature + 0.08);
                break;
            case "cool":
                Atom.Excited = Math.max(0, (Atom.Excited || 0) - 0.5);
                Atom.Velocity[0] *= 0.5;
                Atom.Velocity[1] *= 0.5;
                Atom.Velocity[2] *= 0.5;
                CanvasRenderer.Temperature = Math.max(0, CanvasRenderer.Temperature - 0.08);
                break;
            case "breakbonds": {
                const Idx = Objects.indexOf(Atom);
                if (Idx >= 0) {
                    CanvasRenderer.PreviousBondPairs = new Set(CanvasRenderer.ActiveBondPairs);
                    const ToRemove = [];
                    for (const Key of CanvasRenderer.ActiveBondPairs) {
                        const [A, B] = Key.split("_").map(Number);
                        if (A === Idx || B === Idx) ToRemove.push(Key);
                    }
                    for (const Key of ToRemove) {
                        CanvasRenderer.ActiveBondPairs.delete(Key);
                        CanvasRenderer.BondData.delete(Key);
                    }
                }
                break;
            }
            case "ionize":
                Atom.ExtraCharge = (Atom.ExtraCharge || 0) + 0.6;
                break;
            case "neutralize":
                Atom.ExtraCharge = 0;
                break;
            case "decay": {
                if (CanvasRenderer.DecayAtom) {
                    CanvasRenderer.DecayAtom(Atom);
                }
                break;
            }
            case "focus": {
                CanvasRenderer.CameraTarget = [...Atom.Position];
                const Fwd = GetCameraForward();
                CanvasRenderer.CameraPosition = [
                    Atom.Position[0] - Fwd[0] * 350,
                    Atom.Position[1] - Fwd[1] * 350,
                    Atom.Position[2] - Fwd[2] * 350
                ];
                break;
            }
            case "delete": {
                const Idx = Objects.indexOf(Atom);
                if (Idx >= 0) {
                    Objects.splice(Idx, 1);
                    if (SelectedObject === Atom) {
                        SelectedObject = null;
                        CanvasRenderer.SelectedObject = null;
                    }
                    if (HoveredObject === Atom) {
                        HoveredObject = null;
                        CanvasRenderer.HoveredObject = null;
                    }
                }
                break;
            }
        }

        HideContextMenu();
    });
}

window.addEventListener("wheel", (Event) => {
    Event.preventDefault();
    if (Event.ctrlKey) {
        const Snap = 0.05;
        const Delta = Event.deltaY < 0 ? Snap : -Snap;
        let NextScale = Math.round((CanvasRenderer.TargetTimeScale + Delta) / Snap) * Snap;
        NextScale = Math.max(0.0, Math.min(4.0, NextScale));
        CanvasRenderer.TargetTimeScale = Number(NextScale.toFixed(2));
        if (NextScale <= 0) CanvasRenderer.TimeScale = 0;
    } else if (Event.altKey) {
        const Snap = 0.05;
        const Delta = Event.deltaY < 0 ? Snap : -Snap;
        let NextTemp = Math.round((CanvasRenderer.Temperature + Delta) / Snap) * Snap;
        NextTemp = Math.max(0.0, Math.min(2.0, NextTemp));
        CanvasRenderer.Temperature = Number(NextTemp.toFixed(2));
        const BathEl = document.getElementById("PrefBath");
        const BathVal = document.getElementById("PrefBathVal");
        if (BathEl) BathEl.value = String(NextTemp);
        if (BathVal) BathVal.textContent = NextTemp.toFixed(2);
    } else {
        const ZoomSpeed = 5;
        const Direction = Event.deltaY < 0 ? 1 : -1;
        const Forward = GetCameraForward();
        CameraVelocity[0] += Forward[0] * Direction * ZoomSpeed;
        CameraVelocity[1] += Forward[1] * Direction * ZoomSpeed;
        CameraVelocity[2] += Forward[2] * Direction * ZoomSpeed;
    }
}, { passive: false });

CanvasRenderer.Temperature = 0.05;
CanvasRenderer.FreeEnergy = 0;
CanvasRenderer.SettleFrames = 180;
{
    const BathEl = document.getElementById("PrefBath");
    const BathVal = document.getElementById("PrefBathVal");
    if (BathEl) BathEl.value = "0.05";
    if (BathVal) BathVal.textContent = "0.05";
}

function GetCameraForward() {
    return [
        Math.cos(CurrentPitch) * Math.cos(CurrentYaw),
        Math.sin(CurrentPitch),
        Math.cos(CurrentPitch) * Math.sin(CurrentYaw)
    ];
}

function GetScreenRay(ScreenX, ScreenY) {
    const Rect = Canvas.getBoundingClientRect();
    const NdcX = ((ScreenX - Rect.left) / Rect.width) * 2 - 1;
    const NdcY = -(((ScreenY - Rect.top) / Rect.height) * 2 - 1);

    const Aspect = Canvas.width / Canvas.height;
    const Fov = Math.PI / 4;
    const TanFov = Math.tan(Fov / 2);

    const Forward = GetCameraForward();
    const Up = [0, 1, 0];
    const Right = Normalize3(Cross3(Forward, Up));
    const TrueUp = Cross3(Right, Forward);

    const RayDir = Normalize3([
        Forward[0] + Right[0] * NdcX * TanFov * Aspect + TrueUp[0] * NdcY * TanFov,
        Forward[1] + Right[1] * NdcX * TanFov * Aspect + TrueUp[1] * NdcY * TanFov,
        Forward[2] + Right[2] * NdcX * TanFov * Aspect + TrueUp[2] * NdcY * TanFov
    ]);

    return { Origin: [...CanvasRenderer.CameraPosition], Direction: RayDir };
}

function RaySphereIntersection(RayOrigin, RayDir, SphereCenter, SphereRadius) {
    const Oc = Subtract3(SphereCenter, RayOrigin);
    const Tca = Dot3(Oc, RayDir);
    if (Tca < 0) return null;
    const D2 = Dot3(Oc, Oc) - Tca * Tca;
    const Radius2 = SphereRadius * SphereRadius;
    if (D2 > Radius2) return null;
    const Thc = Math.sqrt(Radius2 - D2);
    return Tca - Thc;
}

function RayPlaneIntersection(RayOrigin, RayDir, PlanePoint, PlaneNormal) {
    const Denom = Dot3(PlaneNormal, RayDir);
    if (Math.abs(Denom) < 0.0001) return null;
    const T = Dot3(Subtract3(PlanePoint, RayOrigin), PlaneNormal) / Denom;
    if (T < 0) return null;
    return [
        RayOrigin[0] + RayDir[0] * T,
        RayOrigin[1] + RayDir[1] * T,
        RayOrigin[2] + RayDir[2] * T
    ];
}

function PickAtom(Ray) {
    let ClosestObject = null;
    let ClosestT = Infinity;

    for (const Obj of Objects) {
        const Radius = Math.max(8, (Obj.Atom.AtomicRadius ?? 100) * CanvasRenderer.RadiusScale * 0.3);
        const HitT = RaySphereIntersection(Ray.Origin, Ray.Direction, Obj.Position, Radius);
        if (HitT !== null && HitT < ClosestT) {
            ClosestT = HitT;
            ClosestObject = Obj;
        }
    }
    return ClosestObject;
}

const UpdateCamera = () => {
    CurrentYaw += (TargetYaw - CurrentYaw) * 0.1;
    CurrentPitch += (TargetPitch - CurrentPitch) * 0.1;

    const Forward = GetCameraForward();
    const Right = [-Math.sin(CurrentYaw), 0, Math.cos(CurrentYaw)];

    let MoveX = 0;
    let MoveY = 0;
    let MoveZ = 0;

    if (KeyStates["KeyW"]) {
        MoveX += Forward[0] * CameraAcceleration;
        MoveY += Forward[1] * CameraAcceleration;
        MoveZ += Forward[2] * CameraAcceleration;
    }
    if (KeyStates["KeyS"]) {
        MoveX -= Forward[0] * CameraAcceleration;
        MoveY -= Forward[1] * CameraAcceleration;
        MoveZ -= Forward[2] * CameraAcceleration;
    }
    if (KeyStates["KeyD"]) {
        MoveX += Right[0] * CameraAcceleration;
        MoveY += Right[1] * CameraAcceleration;
        MoveZ += Right[2] * CameraAcceleration;
    }
    if (KeyStates["KeyA"]) {
        MoveX -= Right[0] * CameraAcceleration;
        MoveY -= Right[1] * CameraAcceleration;
        MoveZ -= Right[2] * CameraAcceleration;
    }
    if (KeyStates["Space"]) MoveY += CameraAcceleration;
    if (KeyStates["ShiftLeft"] || KeyStates["ShiftRight"]) MoveY -= CameraAcceleration;

    CameraVelocity[0] = (CameraVelocity[0] + MoveX) * CameraDamping;
    CameraVelocity[1] = (CameraVelocity[1] + MoveY) * CameraDamping;
    CameraVelocity[2] = (CameraVelocity[2] + MoveZ) * CameraDamping;

    CanvasRenderer.CameraPosition[0] += CameraVelocity[0];
    CanvasRenderer.CameraPosition[1] += CameraVelocity[1];
    CanvasRenderer.CameraPosition[2] += CameraVelocity[2];

    CanvasRenderer.CameraTarget[0] = CanvasRenderer.CameraPosition[0] + Forward[0] * 100;
    CanvasRenderer.CameraTarget[1] = CanvasRenderer.CameraPosition[1] + Forward[1] * 100;
    CanvasRenderer.CameraTarget[2] = CanvasRenderer.CameraPosition[2] + Forward[2] * 100;
};

const HierarchyTree = document.getElementById("HierarchyTree");
const HierarchyCollapseAllBtn = document.getElementById("HierarchyCollapseAll");
const HierarchyExpandAllBtn = document.getElementById("HierarchyExpandAll");
const HierarchyCollapsed = new Set();
let HierarchyForceMode = null;
let LastHierarchySignature = "";
let HierarchyPointerDown = false;

const Prefs = {
    ExciteAmount: 0.8,
    ImpulseStrength: 8,
    ShakeIntensity: 1.0,
    SpawnSpeed: 0.5,
    BoundX: 400,
    BoundY: 400,
    BoundZ: 300
};

HierarchyCollapsed.add("free_atoms");

function SyncHierarchyForceButtons() {
    if (HierarchyCollapseAllBtn) {
        HierarchyCollapseAllBtn.classList.toggle("active", HierarchyForceMode === "collapse");
    }
    if (HierarchyExpandAllBtn) {
        HierarchyExpandAllBtn.classList.toggle("active", HierarchyForceMode === "expand");
    }
}

function CollectAllGroupKeys() {
    const Groups = BuildMoleculeGroups();
    const Entries = [...Groups.entries()].sort((A, B) => {
        if (B[1].length !== A[1].length) return B[1].length - A[1].length;
        return FormulaFromIndices(A[1]).localeCompare(FormulaFromIndices(B[1]));
    });
    const Keys = [];
    let GroupIdx = 0;
    let FreeCount = 0;
    for (const [, Indices] of Entries) {
        if (Indices.length === 1) {
            FreeCount++;
            continue;
        }
        const Formula = FormulaFromIndices(Indices);
        Keys.push(`g${GroupIdx}_${Formula}_${Indices.length}`);
        GroupIdx++;
    }
    if (FreeCount > 0) Keys.push("free_atoms");
    return Keys;
}

function ApplyHierarchyForceMode() {
    if (HierarchyForceMode === "collapse") {
        HierarchyCollapsed.clear();
        for (const Key of CollectAllGroupKeys()) HierarchyCollapsed.add(Key);
    } else if (HierarchyForceMode === "expand") {
        HierarchyCollapsed.clear();
    }
}

function BuildMoleculeGroups() {
    const N = Objects.length;
    const Parent = Array.from({ length: N }, (_, i) => i);

    const Find = (i) => {
        while (Parent[i] !== i) {
            Parent[i] = Parent[Parent[i]];
            i = Parent[i];
        }
        return i;
    };
    const Union = (a, b) => {
        const Ra = Find(a);
        const Rb = Find(b);
        if (Ra !== Rb) Parent[Rb] = Ra;
    };

    for (const Key of CanvasRenderer.ActiveBondPairs) {
        const [A, B] = Key.split("_").map(Number);
        if (A < N && B < N) Union(A, B);
    }

    const Groups = new Map();
    for (let i = 0; i < N; i++) {
        const Root = Find(i);
        if (!Groups.has(Root)) Groups.set(Root, []);
        Groups.get(Root).push(i);
    }
    return Groups;
}

function FormulaFromIndices(Indices) {
    const Counts = {};
    for (const i of Indices) {
        const K = Objects[i].Key;
        Counts[K] = (Counts[K] || 0) + 1;
    }
    const Keys = Object.keys(Counts).sort((A, B) => {
        if (A === "C") return -1;
        if (B === "C") return 1;
        if (A === "H") return -1;
        if (B === "H") return 1;
        return A.localeCompare(B);
    });
    return Keys.map((K) => Counts[K] > 1 ? `${K}${Counts[K]}` : K).join("");
}

function HierarchySignature(Entries) {
    return Entries.map(([, Idx]) => Idx.slice().sort((A, B) => A - B).join(",")).join("|")
        + `#${SelectedObject ? Objects.indexOf(SelectedObject) : -1}`
        + `#${[...HierarchyCollapsed].join(",")}`;
}

function SelectAtomByIndex(Index) {
    if (Index < 0 || Index >= Objects.length) return;
    const Atom = Objects[Index];
    SelectedObject = Atom;
    CanvasRenderer.SelectedObject = Atom;
    if (HierarchyTree) {
        HierarchyTree.querySelectorAll(".HierAtom").forEach((Row) => {
            const I = Number(Row.dataset.index);
            Row.classList.toggle("selected", I === Index);
        });
    }
}

function FocusAtomByIndex(Index) {
    SelectAtomByIndex(Index);
    const Atom = Objects[Index];
    if (!Atom) return;
    const Fwd = GetCameraForward();
    CanvasRenderer.CameraTarget = [...Atom.Position];
    CanvasRenderer.CameraPosition = [
        Atom.Position[0] - Fwd[0] * 350,
        Atom.Position[1] - Fwd[1] * 350,
        Atom.Position[2] - Fwd[2] * 350
    ];
}

function UpdateHierarchy(ForceRebuild = false) {
    if (!HierarchyTree) return;
    if (HierarchyPointerDown && !ForceRebuild) {
        HierarchyTree.querySelectorAll(".HierAtom").forEach((Row) => {
            const I = Number(Row.dataset.index);
            if (I >= 0 && I < Objects.length) {
                const Ke = Objects[I].KineticEnergy || 0;
                const KeEl = Row.querySelector(".HierAtomKe");
                if (KeEl) KeEl.textContent = Ke.toFixed(1);
                Row.classList.toggle("hot", Ke > 8 || (Objects[I].Excited || 0) > 0.3);
                Row.classList.toggle("excited", (Objects[I].Excited || 0) > 0.05);
            }
        });
        return;
    }

    const Groups = BuildMoleculeGroups();
    const Entries = [...Groups.entries()].sort((A, B) => {
        if (B[1].length !== A[1].length) return B[1].length - A[1].length;
        return FormulaFromIndices(A[1]).localeCompare(FormulaFromIndices(B[1]));
    });

    const Sig = HierarchySignature(Entries);
    const StructureChanged = ForceRebuild || Sig !== LastHierarchySignature;

    if (!StructureChanged) {
        HierarchyTree.querySelectorAll(".HierAtom").forEach((Row) => {
            const I = Number(Row.dataset.index);
            if (I >= 0 && I < Objects.length) {
                const Atom = Objects[I];
                const Ke = Atom.KineticEnergy || 0;
                const KeEl = Row.querySelector(".HierAtomKe");
                if (KeEl) KeEl.textContent = Ke.toFixed(1);
                Row.classList.toggle("selected", SelectedObject === Atom);
                Row.classList.toggle("hot", Ke > 8 || (Atom.Excited || 0) > 0.3);
                Row.classList.toggle("excited", (Atom.Excited || 0) > 0.05);
            }
        });
        HierarchyTree.querySelectorAll(".HierGroup").forEach((GroupEl) => {
            const Meta = GroupEl.querySelector(".HierGroupMeta");
            if (!Meta) return;
            const Indices = (GroupEl.dataset.indices || "").split(",").map(Number).filter((N) => !isNaN(N));
            let TotalKe = 0;
            for (const i of Indices) if (Objects[i]) TotalKe += Objects[i].KineticEnergy || 0;
            Meta.textContent = `${Indices.length} | KE ${TotalKe.toFixed(1)}`;
        });
        return;
    }

    LastHierarchySignature = Sig;
    if (HierarchyForceMode) ApplyHierarchyForceMode();
    const Fragments = [];
    let GroupIdx = 0;

    const FreeIndices = [];
    const MoleculeEntries = [];
    for (const [, Indices] of Entries) {
        if (Indices.length === 1) FreeIndices.push(Indices[0]);
        else MoleculeEntries.push(Indices);
    }

    const BuildGroup = (GroupKey, Label, Indices, Collapsible) => {
        let IsCollapsed = HierarchyCollapsed.has(GroupKey);
        if (HierarchyForceMode === "collapse") IsCollapsed = true;
        if (HierarchyForceMode === "expand") IsCollapsed = false;
        let TotalKe = 0;
        for (const i of Indices) TotalKe += Objects[i].KineticEnergy || 0;

        const GroupEl = document.createElement("div");
        GroupEl.className = "HierGroup";
        GroupEl.dataset.groupKey = GroupKey;
        GroupEl.dataset.indices = Indices.join(",");

        const Header = document.createElement("div");
        Header.className = "HierGroupHeader";
        Header.dataset.groupKey = GroupKey;
        Header.dataset.molecule = Collapsible ? "1" : "0";
        Header.innerHTML = `
            <span class="HierChevron">${Collapsible ? (IsCollapsed ? ">" : "v") : "*"}</span>
            <span class="HierGroupLabel">${Label}</span>
            <span class="HierGroupMeta">${Indices.length} | KE ${TotalKe.toFixed(1)}</span>
        `;
        GroupEl.appendChild(Header);

        const Children = document.createElement("div");
        Children.className = "HierChildren" + (IsCollapsed ? " collapsed" : "");

        for (const i of Indices) {
            const AtomObj = Objects[i];
            const Row = document.createElement("div");
            Row.className = "HierAtom";
            Row.dataset.index = String(i);
            if (SelectedObject === AtomObj) Row.classList.add("selected");
            if ((AtomObj.KineticEnergy || 0) > 8 || (AtomObj.Excited || 0) > 0.3) Row.classList.add("hot");
            if ((AtomObj.Excited || 0) > 0.05) Row.classList.add("excited");
            const MassNumber = (AtomObj.Protons || 0) + (AtomObj.Neutrons || 0);
            const UnstableMark = AtomObj.Stable ? "" : " *";
            Row.innerHTML = `
                <span class="HierAtomName">${AtomObj.Key} | ${AtomObj.Atom.Name || AtomObj.Key}${UnstableMark} (A=${MassNumber})</span>
                <span class="HierAtomKe">${(AtomObj.KineticEnergy || 0).toFixed(1)}</span>
            `;
            Children.appendChild(Row);
        }

        GroupEl.appendChild(Children);
        Fragments.push(GroupEl);
    };

    for (const Indices of MoleculeEntries) {
        const Formula = FormulaFromIndices(Indices);
        const GroupKey = `g${GroupIdx}_${Formula}_${Indices.length}`;
        BuildGroup(GroupKey, Formula, Indices, true);
        GroupIdx++;
    }

    if (FreeIndices.length > 0) {
        BuildGroup("free_atoms", `Free (${FreeIndices.length})`, FreeIndices, true);
    }

    HierarchyTree.replaceChildren(...Fragments);
}

if (HierarchyTree) {
    HierarchyTree.addEventListener("pointerdown", (E) => {
        HierarchyPointerDown = true;
        const AtomRow = E.target.closest(".HierAtom");
        if (AtomRow && AtomRow.dataset.index !== undefined) {
            E.preventDefault();
            E.stopPropagation();
            SelectAtomByIndex(Number(AtomRow.dataset.index));
        }
        const Header = E.target.closest(".HierGroupHeader");
        if (Header && Header.dataset.molecule === "1") {
            E.preventDefault();
            E.stopPropagation();
            HierarchyForceMode = null;
            SyncHierarchyForceButtons();
            const Key = Header.dataset.groupKey;
            if (HierarchyCollapsed.has(Key)) HierarchyCollapsed.delete(Key);
            else HierarchyCollapsed.add(Key);
            UpdateHierarchy(true);
        }
    });

    HierarchyTree.addEventListener("pointerup", () => {
        HierarchyPointerDown = false;
    });

    HierarchyTree.addEventListener("pointerleave", () => {
        HierarchyPointerDown = false;
    });

    HierarchyTree.addEventListener("dblclick", (E) => {
        const AtomRow = E.target.closest(".HierAtom");
        if (AtomRow && AtomRow.dataset.index !== undefined) {
            E.preventDefault();
            FocusAtomByIndex(Number(AtomRow.dataset.index));
        }
    });
}

if (HierarchyCollapseAllBtn) {
    HierarchyCollapseAllBtn.addEventListener("click", (E) => {
        E.stopPropagation();
        HierarchyForceMode = HierarchyForceMode === "collapse" ? null : "collapse";
        ApplyHierarchyForceMode();
        SyncHierarchyForceButtons();
        UpdateHierarchy(true);
    });
}

if (HierarchyExpandAllBtn) {
    HierarchyExpandAllBtn.addEventListener("click", (E) => {
        E.stopPropagation();
        HierarchyForceMode = HierarchyForceMode === "expand" ? null : "expand";
        ApplyHierarchyForceMode();
        SyncHierarchyForceButtons();
        UpdateHierarchy(true);
    });
}

SyncHierarchyForceButtons();

const AtomSelect = document.getElementById("AtomSelect");
const SpawnAtomBtn = document.getElementById("SpawnAtomBtn");
const SpawnCountInput = document.getElementById("SpawnCount");

if (AtomSelect && typeof Atoms !== "undefined") {
    const Common = ["H", "C", "N", "O", "F", "Na", "Mg", "Si", "P", "S", "Cl", "Fe", "Cu", "Zn", "Br", "I", "Au", "U"];
    const AllKeys = Object.keys(Atoms);
    const Ordered = [
        ...Common.filter((K) => Atoms[K]),
        ...AllKeys.filter((K) => !Common.includes(K))
    ];
    for (const Key of Ordered) {
        const Opt = document.createElement("option");
        Opt.value = Key;
        Opt.textContent = `${Key} - ${Atoms[Key].Name}`;
        AtomSelect.appendChild(Opt);
    }
    AtomSelect.value = "C";
}

let SpawnClusterCenter = null;
let SpawnClusterTime = 0;

function SpawnAtoms() {
    if (!AtomSelect) return;
    const Key = AtomSelect.value;
    const Count = Math.max(1, Math.min(20, Number(SpawnCountInput?.value) || 1));
    const Speed = Prefs.SpawnSpeed;
    const Cam = CanvasRenderer.CameraPosition;
    const Fwd = GetCameraForward();
    const Now = performance.now();

    if (!SpawnClusterCenter || Now - SpawnClusterTime > 2500) {
        SpawnClusterCenter = [
            Cam[0] + Fwd[0] * 260,
            Cam[1] + Fwd[1] * 260,
            Cam[2] + Fwd[2] * 260
        ];
    }
    SpawnClusterTime = Now;

    let Last = null;
    for (let i = 0; i < Count; i++) {
        const Jitter = [
            (Math.random() - 0.5) * 28,
            (Math.random() - 0.5) * 28,
            (Math.random() - 0.5) * 28
        ];
        const Vel = [
            (Math.random() - 0.5) * Speed,
            (Math.random() - 0.5) * Speed,
            (Math.random() - 0.5) * Speed
        ];
        Last = Atom(Key, [
            SpawnClusterCenter[0] + Jitter[0],
            SpawnClusterCenter[1] + Jitter[1],
            SpawnClusterCenter[2] + Jitter[2]
        ], Vel);
    }
    if (Last) {
        SelectedObject = Last;
        CanvasRenderer.SelectedObject = Last;
    }
    UpdateHierarchy(true);
}

if (SpawnAtomBtn) {
    SpawnAtomBtn.addEventListener("click", (E) => {
        E.stopPropagation();
        SpawnAtoms();
    });
}

function WirePref(Id, Key, Format = (V) => V.toFixed(1)) {
    const El = document.getElementById(Id);
    const Val = document.getElementById(Id + "Val");
    if (!El) return;
    El.addEventListener("input", () => {
        const V = Number(El.value);
        Prefs[Key] = V;
        if (Val) Val.textContent = Format(V);
        if (Key === "ShakeIntensity") {
            CanvasRenderer.ShakeIntensity = V;
        }
    });
}

WirePref("PrefExcite", "ExciteAmount");
WirePref("PrefImpulse", "ImpulseStrength", (V) => String(V));
WirePref("PrefShake", "ShakeIntensity");
WirePref("PrefSpawnSpeed", "SpawnSpeed");

function WireBound(Id, Axis) {
    const El = document.getElementById(Id);
    const Val = document.getElementById(Id + "Val");
    if (!El) return;
    El.addEventListener("input", () => {
        const V = Number(El.value);
        Prefs["Bound" + Axis] = V;
        CanvasRenderer["Boundary" + Axis] = V;
        if (Val) Val.textContent = String(Math.round(V));
        if (BoundsSizeLabel) {
            BoundsSizeLabel.textContent = `${Math.round(CanvasRenderer.BoundaryX)}/${Math.round(CanvasRenderer.BoundaryY)}/${Math.round(CanvasRenderer.BoundaryZ)}`;
        }
    });
}
WireBound("PrefBoundX", "X");
WireBound("PrefBoundY", "Y");
WireBound("PrefBoundZ", "Z");

const PrefBathEl = document.getElementById("PrefBath");
if (PrefBathEl) {
    PrefBathEl.addEventListener("input", () => {
        const V = Number(PrefBathEl.value);
        CanvasRenderer.Temperature = V;
        const Val = document.getElementById("PrefBathVal");
        if (Val) Val.textContent = V.toFixed(2);
        if (BathTempLabel) BathTempLabel.textContent = V.toFixed(2);
    });
}

const PrefFreeEl = document.getElementById("PrefFreeEnergy");
if (PrefFreeEl) {
    PrefFreeEl.addEventListener("input", () => {
        const V = Number(PrefFreeEl.value);
        CanvasRenderer.FreeEnergy = V;
        const Val = document.getElementById("PrefFreeEnergyVal");
        if (Val) Val.textContent = V.toFixed(1);
    });
}

CanvasRenderer.ShakeIntensity = Prefs.ShakeIntensity;
CanvasRenderer.BoundaryX = Prefs.BoundX;
CanvasRenderer.BoundaryY = Prefs.BoundY;
CanvasRenderer.BoundaryZ = Prefs.BoundZ;

let LastFrameTime = performance.now();
let FrameCounter = 0;
let FpsTimer = 0;

const Update = () => {
    const Now = performance.now();
    const DeltaTime = Now - LastFrameTime;
    LastFrameTime = Now;

    FrameCounter++;
    FpsTimer += DeltaTime;

    if (DeltaTimeLabel) {
        DeltaTimeLabel.textContent = `${DeltaTime.toFixed(3)}ms`;
    }
    if (TimeScaleLabel) {
        const Ts = CanvasRenderer.TargetTimeScale;
        TimeScaleLabel.textContent = Ts <= 0 ? "PAUSED" : `${Ts.toFixed(2)}x`;
    }

    if (TemperatureLabel) {
        let SumKe = 0;
        for (const O of Objects) SumKe += O.KineticEnergy || 0;
        const AvgKe = Objects.length > 0 ? SumKe / Objects.length : 0;
        TemperatureLabel.textContent = (AvgKe * 0.12).toFixed(2);
    }
    if (BathTempLabel) {
        BathTempLabel.textContent = CanvasRenderer.Temperature.toFixed(2);
    }
    if (BoundsSizeLabel) {
        BoundsSizeLabel.textContent =
            `${Math.round(CanvasRenderer.BoundaryX)}/${Math.round(CanvasRenderer.BoundaryY)}/${Math.round(CanvasRenderer.BoundaryZ)}`;
    }

    if (FpsTimer >= 1000) {
        const Fps = Math.round((FrameCounter * 1000) / FpsTimer);
        if (FramerateLabel) {
            FramerateLabel.textContent = `${String(Fps).padStart(3, "0")}/s`;
        }
        FrameCounter = 0;
        FpsTimer = 0;
    }

    UpdateHierarchy();

    UpdateCamera();
    CanvasRenderer.Render();

    if (globalThis.Plugin) {
        globalThis.Plugin.Tick(DeltaTime);
    }

    requestAnimationFrame(Update);
};

requestAnimationFrame(() => {
    if (globalThis.Plugin) globalThis.Plugin.Boot();
});
requestAnimationFrame(Update);