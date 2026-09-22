globalThis.Chemistry = {};

const ElectronConfigs = {
    H: "1s1", He: "1s2", Li: "[He]2s1", Be: "[He]2s2", B: "[He]2s2 2p1", C: "[He]2s2 2p2",
    N: "[He]2s2 2p3", O: "[He]2s2 2p4", F: "[He]2s2 2p5", Ne: "[He]2s2 2p6",
    Na: "[Ne]3s1", Mg: "[Ne]3s2", Al: "[Ne]3s2 3p1", Si: "[Ne]3s2 3p2", P: "[Ne]3s2 3p3",
    S: "[Ne]3s2 3p4", Cl: "[Ne]3s2 3p5", Ar: "[Ne]3s2 3p6",
    K: "[Ar]4s1", Ca: "[Ar]4s2", Sc: "[Ar]3d1 4s2", Ti: "[Ar]3d2 4s2", V: "[Ar]3d3 4s2",
    Cr: "[Ar]3d5 4s1", Mn: "[Ar]3d5 4s2", Fe: "[Ar]3d6 4s2", Co: "[Ar]3d7 4s2", Ni: "[Ar]3d8 4s2",
    Cu: "[Ar]3d10 4s1", Zn: "[Ar]3d10 4s2", Ga: "[Ar]3d10 4s2 4p1", Ge: "[Ar]3d10 4s2 4p2",
    As: "[Ar]3d10 4s2 4p3", Se: "[Ar]3d10 4s2 4p4", Br: "[Ar]3d10 4s2 4p5", Kr: "[Ar]3d10 4s2 4p6",
    Rb: "[Kr]5s1", Sr: "[Kr]5s2", Y: "[Kr]4d1 5s2", Zr: "[Kr]4d2 5s2", Nb: "[Kr]4d4 5s1",
    Mo: "[Kr]4d5 5s1", Tc: "[Kr]4d5 5s2", Ru: "[Kr]4d7 5s1", Rh: "[Kr]4d8 5s1", Pd: "[Kr]4d10",
    Ag: "[Kr]4d10 5s1", Cd: "[Kr]4d10 5s2", In: "[Kr]4d10 5s2 5p1", Sn: "[Kr]4d10 5s2 5p2",
    Sb: "[Kr]4d10 5s2 5p3", Te: "[Kr]4d10 5s2 5p4", I: "[Kr]4d10 5s2 5p5", Xe: "[Kr]4d10 5s2 5p6",
    Cs: "[Xe]6s1", Ba: "[Xe]6s2", La: "[Xe]5d1 6s2", Ce: "[Xe]4f1 5d1 6s2", Pr: "[Xe]4f3 6s2",
    Nd: "[Xe]4f4 6s2", Pm: "[Xe]4f5 6s2", Sm: "[Xe]4f6 6s2", Eu: "[Xe]4f7 6s2", Gd: "[Xe]4f7 5d1 6s2",
    Tb: "[Xe]4f9 6s2", Dy: "[Xe]4f10 6s2", Ho: "[Xe]4f11 6s2", Er: "[Xe]4f12 6s2", Tm: "[Xe]4f13 6s2",
    Yb: "[Xe]4f14 6s2", Lu: "[Xe]4f14 5d1 6s2", Hf: "[Xe]4f14 5d2 6s2", Ta: "[Xe]4f14 5d3 6s2",
    W: "[Xe]4f14 5d4 6s2", Re: "[Xe]4f14 5d5 6s2", Os: "[Xe]4f14 5d6 6s2", Ir: "[Xe]4f14 5d7 6s2",
    Pt: "[Xe]4f14 5d9 6s1", Au: "[Xe]4f14 5d10 6s1", Hg: "[Xe]4f14 5d10 6s2",
    Tl: "[Xe]4f14 5d10 6s2 6p1", Pb: "[Xe]4f14 5d10 6s2 6p2", Bi: "[Xe]4f14 5d10 6s2 6p3",
    Po: "[Xe]4f14 5d10 6s2 6p4", At: "[Xe]4f14 5d10 6s2 6p5", Rn: "[Xe]4f14 5d10 6s2 6p6",
    Fr: "[Rn]7s1", Ra: "[Rn]7s2", Ac: "[Rn]6d1 7s2", Th: "[Rn]6d2 7s2", Pa: "[Rn]5f2 6d1 7s2",
    U: "[Rn]5f3 6d1 7s2", Np: "[Rn]5f4 6d1 7s2", Pu: "[Rn]5f6 7s2", Am: "[Rn]5f7 7s2",
    Cm: "[Rn]5f7 6d1 7s2", Bk: "[Rn]5f9 7s2", Cf: "[Rn]5f10 7s2", Es: "[Rn]5f11 7s2",
    Fm: "[Rn]5f12 7s2", Md: "[Rn]5f13 7s2", No: "[Rn]5f14 7s2", Lr: "[Rn]5f14 7s2 7p1",
    Rf: "[Rn]5f14 6d2 7s2", Db: "[Rn]5f14 6d3 7s2", Sg: "[Rn]5f14 6d4 7s2", Bh: "[Rn]5f14 6d5 7s2",
    Hs: "[Rn]5f14 6d6 7s2", Mt: "[Rn]5f14 6d7 7s2", Ds: "[Rn]5f14 6d8 7s2", Rg: "[Rn]5f14 6d9 7s2",
    Cn: "[Rn]5f14 6d10 7s2", Nh: "[Rn]5f14 6d10 7s2 7p1", Fl: "[Rn]5f14 6d10 7s2 7p2",
    Mc: "[Rn]5f14 6d10 7s2 7p3", Lv: "[Rn]5f14 6d10 7s2 7p4", Ts: "[Rn]5f14 6d10 7s2 7p5",
    Og: "[Rn]5f14 6d10 7s2 7p6"
};

const OxidationStates = {
    H: [-1, 1], He: [0], Li: [1], Be: [2], B: [3], C: [-4, 2, 4], N: [-3, 3, 5],
    O: [-2, -1], F: [-1], Ne: [0], Na: [1], Mg: [2], Al: [3], Si: [-4, 4],
    P: [-3, 3, 5], S: [-2, 4, 6], Cl: [-1, 1, 5, 7], Ar: [0], K: [1], Ca: [2],
    Sc: [3], Ti: [4], V: [5], Cr: [3, 6], Mn: [2, 4, 7], Fe: [2, 3], Co: [2, 3],
    Ni: [2], Cu: [1, 2], Zn: [2], Ga: [3], Ge: [4], As: [-3, 3, 5], Se: [-2, 4, 6],
    Br: [-1, 1, 5], Kr: [0], Rb: [1], Sr: [2], Y: [3], Zr: [4], Nb: [5], Mo: [4, 6],
    Tc: [4, 7], Ru: [3, 4], Rh: [3], Pd: [2, 4], Ag: [1], Cd: [2], In: [3], Sn: [2, 4],
    Sb: [-3, 3, 5], Te: [-2, 4, 6], I: [-1, 1, 5, 7], Xe: [0, 2, 4, 6], Cs: [1], Ba: [2],
    La: [3], Ce: [3, 4], Pr: [3], Nd: [3], Pm: [3], Sm: [2, 3], Eu: [2, 3], Gd: [3],
    Tb: [3, 4], Dy: [3], Ho: [3], Er: [3], Tm: [3], Yb: [2, 3], Lu: [3], Hf: [4],
    Ta: [5], W: [4, 6], Re: [4, 7], Os: [4, 8], Ir: [3, 4], Pt: [2, 4], Au: [1, 3],
    Hg: [1, 2], Tl: [1, 3], Pb: [2, 4], Bi: [3, 5], Po: [2, 4], At: [-1, 1], Rn: [0],
    Fr: [1], Ra: [2], Ac: [3], Th: [4], Pa: [5], U: [4, 6], Np: [5], Pu: [4, 6],
    Am: [3], Cm: [3], Bk: [3], Cf: [3], Es: [3], Fm: [3], Md: [3], No: [2, 3], Lr: [3],
    Rf: [4], Db: [5], Sg: [6], Bh: [7], Hs: [8], Mt: [3], Ds: [2], Rg: [1], Cn: [2],
    Nh: [1], Fl: [2], Mc: [1], Lv: [2], Ts: [1], Og: [0]
};

const ValenceElectronCount = {
    H: 1, He: 2, Li: 1, Be: 2, B: 3, C: 4, N: 5, O: 6, F: 7, Ne: 8,
    Na: 1, Mg: 2, Al: 3, Si: 4, P: 5, S: 6, Cl: 7, Ar: 8,
    K: 1, Ca: 2, Sc: 3, Ti: 4, V: 5, Cr: 6, Mn: 7, Fe: 8, Co: 9, Ni: 10,
    Cu: 11, Zn: 12, Ga: 3, Ge: 4, As: 5, Se: 6, Br: 7, Kr: 8,
    Rb: 1, Sr: 2, Y: 3, Zr: 4, Nb: 5, Mo: 6, Tc: 7, Ru: 8, Rh: 9, Pd: 10,
    Ag: 11, Cd: 12, In: 3, Sn: 4, Sb: 5, Te: 6, I: 7, Xe: 8,
    Cs: 1, Ba: 2, La: 3, Ce: 4, Pr: 5, Nd: 6, Pm: 7, Sm: 8, Eu: 9, Gd: 10,
    Tb: 11, Dy: 12, Ho: 13, Er: 14, Tm: 15, Yb: 16, Lu: 17, Hf: 4, Ta: 5,
    W: 6, Re: 7, Os: 8, Ir: 9, Pt: 10, Au: 11, Hg: 12, Tl: 3, Pb: 4, Bi: 5,
    Po: 6, At: 7, Rn: 8, Fr: 1, Ra: 2, Ac: 3, Th: 4, Pa: 5, U: 6, Np: 7,
    Pu: 8, Am: 9, Cm: 10, Bk: 11, Cf: 12, Es: 13, Fm: 14, Md: 15, No: 16,
    Lr: 17, Rf: 4, Db: 5, Sg: 6, Bh: 7, Hs: 8, Mt: 9, Ds: 10, Rg: 11,
    Cn: 12, Nh: 3, Fl: 4, Mc: 5, Lv: 6, Ts: 7, Og: 8
};

const ElectronAffinity = {
    H: 72.8, He: 0, Li: 59.6, Be: 0, B: 26.7, C: 121.8, N: -7, O: 141.0, F: 328.0, Ne: 0,
    Na: 52.8, Mg: 0, Al: 42.5, Si: 134.1, P: 72.0, S: 200.4, Cl: 349.0, Ar: 0,
    K: 48.4, Ca: 2.4, Fe: 14.8, Cu: 118.4, Zn: 0, Br: 324.5, I: 295.2, Au: 222.7
};

const Polarizability = {
    H: 0.667, He: 0.205, Li: 24.3, C: 1.76, N: 1.10, O: 0.802, F: 0.557,
    Na: 24.1, Mg: 10.6, Si: 5.38, P: 3.63, S: 2.90, Cl: 2.18,
    K: 43.4, Ca: 22.8, Fe: 8.4, Cu: 6.1, Br: 3.05, I: 5.35, Au: 5.8, U: 12.7
};

const SpectralLines = {
    H:    [[656.3, 1.0, "red"], [486.1, 0.7, "cyan"], [434.0, 0.5, "violet"], [410.2, 0.4, "violet"]],
    He:   [[587.6, 1.0, "yellow"], [501.6, 0.6, "green"], [447.1, 0.5, "blue"]],
    Li:   [[670.8, 1.0, "red"], [610.4, 0.4, "orange"]],
    C:    [[247.9, 0.5, "uv"], [193.1, 0.6, "uv"], [165.7, 0.4, "uv"]],
    N:    [[409.9, 0.6, "violet"], [357.7, 0.5, "violet"], [315.9, 0.4, "uv"]],
    O:    [[777.4, 0.9, "red"], [630.0, 0.5, "orange"], [615.8, 0.4, "orange"], [558.0, 0.3, "green"]],
    F:    [[686.0, 0.5, "red"], [624.0, 0.4, "orange"]],
    Ne:   [[640.2, 1.0, "red"], [614.3, 0.6, "orange"], [585.2, 0.8, "yellow"], [540.0, 0.5, "green"]],
    Na:   [[589.0, 1.0, "yellow"], [589.6, 1.0, "yellow"], [568.8, 0.3, "yellow"]],
    Mg:   [[518.4, 1.0, "green"], [517.3, 1.0, "green"], [383.8, 0.5, "uv"]],
    Al:   [[396.1, 0.9, "violet"], [394.4, 0.9, "violet"], [309.2, 0.4, "uv"]],
    Si:   [[288.2, 0.7, "uv"], [251.6, 0.6, "uv"]],
    P:    [[253.6, 0.7, "uv"]],
    S:    [[545.4, 0.4, "green"], [469.4, 0.3, "blue"]],
    Cl:   [[725.6, 0.4, "red"], [539.0, 0.4, "green"], [481.0, 0.3, "blue"]],
    Ar:   [[750.4, 0.8, "red"], [763.5, 0.9, "red"], [696.5, 0.6, "red"]],
    K:    [[766.5, 1.0, "red"], [769.9, 1.0, "red"], [404.4, 0.5, "violet"]],
    Ca:   [[422.7, 1.0, "violet"], [393.4, 0.8, "uv"]],
    Fe:   [[248.3, 0.8, "uv"], [302.1, 0.6, "uv"], [386.0, 0.7, "uv"], [438.4, 0.5, "violet"]],
    Cu:   [[324.8, 0.9, "uv"], [327.4, 0.9, "uv"], [510.6, 0.6, "green"], [578.2, 0.5, "yellow"]],
    Zn:   [[213.9, 0.7, "uv"], [307.6, 0.5, "uv"]],
    Br:   [[478.6, 0.5, "blue"], [447.7, 0.4, "blue"]],
    Ag:   [[328.1, 0.9, "uv"], [338.3, 0.7, "uv"], [520.9, 0.5, "green"]],
    Au:   [[267.6, 0.8, "uv"], [242.8, 0.6, "uv"]],
    Hg:   [[253.7, 1.0, "uv"], [435.8, 0.7, "blue"], [546.1, 0.6, "green"], [577.0, 0.4, "yellow"]],
    Pb:   [[283.3, 0.8, "uv"], [405.8, 0.6, "violet"], [368.3, 0.5, "uv"]],
    U:    [[424.2, 0.6, "violet"], [385.9, 0.5, "uv"]]
};

Chemistry.GetElectronConfig = function (Key) {
    return ElectronConfigs[Key] || "";
};

Chemistry.GetValenceElectrons = function (Key) {
    return ValenceElectronCount[Key] || 0;
};

Chemistry.GetOxidationStates = function (Key) {
    return OxidationStates[Key] || [0];
};

Chemistry.GetElectronAffinity = function (Key) {
    return ElectronAffinity[Key] || 0;
};

Chemistry.GetPolarizability = function (Key) {
    return Polarizability[Key] || 1.0;
};

Chemistry.GetSpectralLines = function (Key) {
    return SpectralLines[Key] || [];
};

Chemistry.CoulombConstant = 3400;
Chemistry.MagneticConstant = 6.0;
Chemistry.CoulombSoftening = 400;
Chemistry.CoulombMaxForce = 120;

const BondOrderTable = {
    "C-C": { 1: { length: 154, energy: 346, stability: 0.95 }, 2: { length: 134, energy: 602, stability: 0.85 }, 3: { length: 120, energy: 835, stability: 0.80 } },
    "C-N": { 1: { length: 147, energy: 305, stability: 0.88 }, 2: { length: 128, energy: 615, stability: 0.78 }, 3: { length: 116, energy: 887, stability: 0.72 } },
    "C-O": { 1: { length: 143, energy: 358, stability: 0.90 }, 2: { length: 120, energy: 745, stability: 0.86 }, 3: { length: 113, energy: 1072, stability: 0.65 } },
    "O-O": { 1: { length: 148, energy: 146, stability: 0.10 }, 2: { length: 121, energy: 498, stability: 0.55 } },
    "N-N": { 1: { length: 145, energy: 167, stability: 0.15 }, 2: { length: 125, energy: 418, stability: 0.35 }, 3: { length: 110, energy: 945, stability: 0.90 } },
    "N-O": { 1: { length: 140, energy: 201, stability: 0.55 }, 2: { length: 121, energy: 607, stability: 0.60 } },
    "C-S": { 1: { length: 182, energy: 272, stability: 0.75 }, 2: { length: 160, energy: 573, stability: 0.70 } },
    "S-O": { 1: { length: 157, energy: 265, stability: 0.70 }, 2: { length: 143, energy: 522, stability: 0.72 } },
    "S-S": { 1: { length: 205, energy: 226, stability: 0.60 }, 2: { length: 189, energy: 425, stability: 0.45 } },
    "P-O": { 1: { length: 160, energy: 335, stability: 0.75 }, 2: { length: 150, energy: 544, stability: 0.78 } }
};

Chemistry.HasMultipleOrders = function (KeyA, KeyB) {
    const A = KeyA < KeyB ? KeyA : KeyB;
    const B = KeyA < KeyB ? KeyB : KeyA;
    return !!BondOrderTable[`${A}-${B}`];
};

Chemistry.GetOrderedBondInfo = function (KeyA, KeyB, RequestedOrder) {
    const A = KeyA < KeyB ? KeyA : KeyB;
    const B = KeyA < KeyB ? KeyB : KeyA;
    const Table = BondOrderTable[`${A}-${B}`];
    if (!Table) return null;
    const AvailableOrders = Object.keys(Table).map(Number).sort((X, Y) => X - Y);
    let Order = RequestedOrder;
    if (!Table[Order]) {
        Order = AvailableOrders.filter((O) => O <= RequestedOrder).pop() ?? AvailableOrders[0];
    }
    const Data = Table[Order];
    return {
        order: Order,
        length: Data.length,
        energy: Data.energy,
        stability: Data.stability
    };
};

Chemistry.ProposeBondOrder = function (KeyA, KeyB, SlackA, SlackB, Distance, EquilibriumSingleLength) {
    const MaxBySlack = Math.min(SlackA, SlackB, 3);
    if (MaxBySlack < 1) return 0;
    if (!Chemistry.HasMultipleOrders(KeyA, KeyB)) return 1;
    const Closeness = Distance / EquilibriumSingleLength;
    if (MaxBySlack >= 3 && Closeness < 0.82) return 3;
    if (MaxBySlack >= 2 && Closeness < 0.90) return 2;
    return 1;
};

const IdealAngleBySteric = {
    2: Math.PI, 3: (120 * Math.PI) / 180, 4: (109.5 * Math.PI) / 180,
    5: (90 * Math.PI) / 180, 6: (90 * Math.PI) / 180
};

Chemistry.IdealAngle = function (StericNumber) {
    return IdealAngleBySteric[StericNumber] || IdealAngleBySteric[4];
};

const LonePairHint = { O: 2, N: 1, S: 2, F: 3, Cl: 3, Br: 3, I: 3, Se: 2, P: 1 };

Chemistry.StericNumber = function (Key, BondCount) {
    if (BondCount <= 0) return 0;
    const LonePairs = LonePairHint[Key] || 0;
    return Math.min(6, BondCount + LonePairs);
};

const CommonIsotope = {
    H: [1, 0], He: [2, 2], Li: [3, 4], Be: [4, 5], B: [5, 6], C: [6, 6],
    N: [7, 7], O: [8, 8], F: [9, 10], Ne: [10, 10], Na: [11, 12], Mg: [12, 12],
    Al: [13, 14], Si: [14, 14], P: [15, 16], S: [16, 16], Cl: [17, 18],
    Ar: [18, 22], K: [19, 20], Ca: [20, 20], Fe: [26, 30], Cu: [29, 34],
    Zn: [30, 34], Ag: [47, 60], Au: [79, 118], Pb: [82, 125], Hg: [80, 120],
    I: [53, 74], Xe: [54, 77],
    Tc: [43, 55], U: [92, 146], Th: [90, 142], Ra: [88, 138], Rn: [86, 136],
    Pu: [94, 150], Np: [93, 144], Am: [95, 148], Cm: [96, 151],
    Pa: [91, 140], Ac: [89, 138], Fr: [87, 136], At: [85, 125], Po: [84, 125]
};

Chemistry.GetIsotope = function (Key, AtomData) {
    if (CommonIsotope[Key]) return CommonIsotope[Key];
    const Z = AtomData.AtomicNumber || 1;
    const A = Math.round(AtomData.AtomicMass || Z * 2);
    return [Z, Math.max(0, A - Z)];
};

Chemistry.IdealNZ = function (Z) {
    if (Z <= 20) return 1.0 + Z * 0.002;
    return 1.0 + (Z - 20) * 0.0075 + 20 * 0.002;
};

const RadioactiveElements = new Set([
    "Tc", "Pm",
    "Po", "At", "Rn", "Fr", "Ra", "Ac", "Th", "Pa", "U", "Np", "Pu",
    "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr",
    "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn",
    "Nh", "Fl", "Mc", "Lv", "Ts", "Og"
]);

Chemistry.HasStableIsotopes = function (Z) {
    const Sym = ElementSymbolFromZ(Z);
    if (!Sym) return false;
    return !RadioactiveElements.has(Sym);
};

Chemistry.IsNaturallyStable = function (Z, N) {
    const Sym = ElementSymbolFromZ(Z);
    if (!Sym) return false;
    if (RadioactiveElements.has(Sym)) return false;

    const Common = CommonIsotope[Sym];
    if (Common && Common[0] === Z && Common[1] === N) return true;

    const Data = globalThis.Atoms && globalThis.Atoms[Sym];
    if (Data) {
        const Zc = Data.AtomicNumber;
        const A = Math.round(Data.AtomicMass || Zc * 2);
        if (Zc === Z && Math.max(0, A - Zc) === N) return true;
    }

    return false;
};

const IsotopeData = {
    "H-3":   { hl: 3.89e8, modes: [{ mode: "beta-minus", branch: 1.0, energy: 18.6 }] },
    "C-14":  { hl: 1.81e11, modes: [{ mode: "beta-minus", branch: 1.0, energy: 156 }] },
    "K-40":  { hl: 3.94e16, modes: [
        { mode: "beta-minus", branch: 0.89, energy: 1311 },
        { mode: "beta-plus", branch: 0.11, energy: 1505 }
    ] },
    "Tc-99": { hl: 6.66e12, modes: [{ mode: "beta-minus", branch: 1.0, energy: 294 }] },
    "I-131": { hl: 6.93e5, modes: [{ mode: "beta-minus", branch: 1.0, energy: 971 }] },
    "Rn-222":{ hl: 3.30e5, modes: [{ mode: "alpha", branch: 1.0, energy: 5590 }] },
    "Ra-226":{ hl: 5.05e10, modes: [{ mode: "alpha", branch: 1.0, energy: 4871 }] },
    "Th-232":{ hl: 4.43e17, modes: [{ mode: "alpha", branch: 1.0, energy: 4081 }] },
    "U-235": { hl: 2.22e16, modes: [{ mode: "alpha", branch: 1.0, energy: 4678 }] },
    "U-238": { hl: 1.41e17, modes: [{ mode: "alpha", branch: 1.0, energy: 4269 }] },
    "Pu-239":{ hl: 7.60e11, modes: [{ mode: "alpha", branch: 1.0, energy: 5245 }] },
    "Pu-244":{ hl: 2.55e15, modes: [{ mode: "alpha", branch: 1.0, energy: 4590 }] },
    "Np-237":{ hl: 6.75e13, modes: [{ mode: "alpha", branch: 1.0, energy: 4937 }] },
    "Am-241":{ hl: 1.36e10, modes: [{ mode: "alpha", branch: 1.0, energy: 5486 }] },
    "Cm-244":{ hl: 5.72e8, modes: [{ mode: "alpha", branch: 1.0, energy: 5901 }] },
    "Pa-231":{ hl: 1.03e12, modes: [{ mode: "alpha", branch: 1.0, energy: 5150 }] },
    "Ac-227":{ hl: 6.87e8, modes: [
        { mode: "beta-minus", branch: 0.986, energy: 44 },
        { mode: "alpha", branch: 0.014, energy: 5042 }
    ] },
    "Fr-223":{ hl: 1.31e3, modes: [
        { mode: "beta-minus", branch: 0.999, energy: 1149 },
        { mode: "alpha", branch: 0.001, energy: 5310 }
    ] },
    "At-210":{ hl: 2.92e4, modes: [{ mode: "alpha", branch: 1.0, energy: 5630 }] },
    "Po-210":{ hl: 1.20e7, modes: [{ mode: "alpha", branch: 1.0, energy: 5304 }] }
};

Chemistry.GetIsotopeData = function (Z, N) {
    const Sym = Chemistry.SymbolFromZ(Z);
    const Key = `${Sym}-${Z + N}`;
    return IsotopeData[Key] || null;
};

function DecayProbabilityPerFrame(HalfLifeS) {
    if (!isFinite(HalfLifeS)) return 0;
    const LogHl = Math.log10(Math.max(1e-6, HalfLifeS));
    const Clamped = Math.max(-6, Math.min(18, LogHl));
    const T = (Clamped + 6) / 24;
    const SimHalfLifeSeconds = 0.6 + T * 39.4;
    const Lambda = Math.LN2 / SimHalfLifeSeconds;
    return 1 - Math.exp(-Lambda / 60);
}

Chemistry.DecayProbability = function (Z, N) {
    const Iso = Chemistry.GetIsotopeData(Z, N);
    if (Iso) return DecayProbabilityPerFrame(Iso.hl);
    if (N === 0 && Z <= 1) return 0;

    if (Chemistry.IsNaturallyStable(Z, N)) return 0;

    const Ideal = Chemistry.IdealNZ(Z);
    const ActualNZ = Z > 0 ? N / Z : 0;
    const Deviation = Math.abs(ActualNZ - Ideal);

    if (Chemistry.HasStableIsotopes(Z) && Deviation < 0.15) return 0;

    if (Z > 82) return DecayProbabilityPerFrame(1e9);

    const Excess = Math.max(0, Deviation - 0.045);
    const PseudoHalfLife = Math.max(0.6, 1e6 / (1 + Excess * 4000));
    return DecayProbabilityPerFrame(PseudoHalfLife);
};

let ZToSymbolCache = null;
function ElementSymbolFromZ(Z) {
    if (!ZToSymbolCache) {
        ZToSymbolCache = {};
        for (const [Sym, Data] of Object.entries(globalThis.Atoms || {})) {
            ZToSymbolCache[Data.AtomicNumber] = Sym;
        }
    }
    return ZToSymbolCache[Z] || `Z${Z}`;
}

Chemistry.SymbolFromZ = ElementSymbolFromZ;

Chemistry.DecayMode = function (Z, N) {
    const Iso = Chemistry.GetIsotopeData(Z, N);
    if (Iso && Iso.modes && Iso.modes.length > 0) {
        let Roll = Math.random();
        for (const M of Iso.modes) {
            if (Roll < M.branch) return M.mode;
            Roll -= M.branch;
        }
        return Iso.modes[0].mode;
    }
    const Ideal = Chemistry.IdealNZ(Z);
    const ActualNZ = Z > 0 ? N / Z : 0;
    if (Z > 82) return "alpha";
    if (ActualNZ > Ideal + 0.02) return "beta-minus";
    if (ActualNZ < Ideal - 0.02) return "beta-plus";
    return "gamma";
};

Chemistry.DecayEnergy = function (Z, N) {
    const Iso = Chemistry.GetIsotopeData(Z, N);
    if (Iso && Iso.modes && Iso.modes.length > 0) {
        return Iso.modes[0].energy;
    }
    return 1000;
};

Chemistry.ApplyDecay = function (Z, N, Mode) {
    switch (Mode) {
        case "alpha": return { Z: Z - 2, N: N - 2, Particle: "alpha" };
        case "beta-minus": return { Z: Z + 1, N: N - 1, Particle: "beta" };
        case "beta-plus": return { Z: Z - 1, N: N + 1, Particle: "positron" };
        case "gamma":
        default: return { Z, N, Particle: "gamma" };
    }
};

Chemistry.VanDerWaalsForce = function (Distance, ContactDistance, WellDepth) {
    if (Distance <= 0) return 0;
    const Sigma = ContactDistance / Math.pow(2, 1 / 6);
    const Ratio = Sigma / Distance;
    const Ratio6 = Math.pow(Ratio, 6);
    const Ratio12 = Ratio6 * Ratio6;
    const ForceMag = 24 * WellDepth * (2 * Ratio12 - Ratio6) / Distance;
    return Math.max(-6, Math.min(6, ForceMag));
};

Chemistry.FormalChargeFromOxidation = function (Key, OxState) {
    return OxState;
};

Chemistry.ReactionEnergy = function (BondsBroken, BondsFormed) {
    let EnergyIn = 0;
    let EnergyOut = 0;
    for (const B of BondsBroken) EnergyIn += B.energy;
    for (const F of BondsFormed) EnergyOut += F.energy;
    return EnergyOut - EnergyIn;
};

const NobleGasSet = new Set(["He", "Ne", "Ar", "Kr", "Xe", "Rn", "Og"]);
Chemistry.NobleGases = NobleGasSet;

Chemistry.IsNoble = function (Key) {
    return NobleGasSet.has(Key);
};

Chemistry.ElectronWant = function (Key) {
    if (NobleGasSet.has(Key)) return 0;
    const Data = globalThis.Atoms && globalThis.Atoms[Key];
    if (!Data) return 0.35;
    const EA = Math.max(0, ElectronAffinity[Key] || 0);
    const EN = Math.max(0, Data.Electronegativity || 2.0);
    const Valence = ValenceElectronCount[Key] || 0;
    const Target = (Data.AtomicNumber || 0) <= 2 ? 2 : 8;
    const Deficit = Math.max(0, Target - Valence);
    const EANorm = Math.min(1, EA / 350);
    const ENNorm = Math.min(1, EN / 4);
    const DefNorm = Math.min(1, Deficit / 6);
    return Math.min(1, EANorm * 0.25 + ENNorm * 0.35 + DefNorm * 0.40);
};

Chemistry.ElectronDonate = function (Key) {
    if (NobleGasSet.has(Key)) return 0;
    const Data = globalThis.Atoms && globalThis.Atoms[Key];
    if (!Data) return 0.2;
    const IE = Data.IonizationEnergy || 1000;
    const EN = Data.Electronegativity || 2.0;
    const IENorm = Math.min(1, Math.max(0, 1 - IE / 1400));
    const ENNorm = Math.min(1, Math.max(0, 1 - EN / 4));
    return Math.min(1, IENorm * 0.55 + ENNorm * 0.45);
};

Chemistry.QuantumShells = function (Key) {
    const Data = globalThis.Atoms && globalThis.Atoms[Key];
    if (!Data) return [];
    const Z = Data.AtomicNumber || 0;
    if (Z <= 0) return [];
    const Capacities = [2, 8, 18, 32, 32, 18, 8];
    const Shells = [];
    let Remaining = Z;
    for (let i = 0; i < Capacities.length && Remaining > 0; i++) {
        const Cap = Capacities[i];
        const Fill = Math.min(Cap, Remaining);
        Shells.push({
            n: i + 1,
            fill: Fill,
            capacity: Cap,
            fraction: Fill / Cap
        });
        Remaining -= Fill;
    }
    if (Shells.length > 0) Shells[Shells.length - 1].valence = true;
    return Shells;
};

Chemistry.ValenceSatisfaction = function (Key, BondOrderSum) {
    if (NobleGasSet.has(Key)) return 1;
    const V = (globalThis.RealisticValence && globalThis.RealisticValence[Key]) || 1;
    if (V <= 0) return 1;
    return Math.min(1, BondOrderSum / V);
};

Chemistry.ChemicalStability = function (Key, BondOrderSum) {
    if (NobleGasSet.has(Key)) return 1;
    const V = (globalThis.RealisticValence && globalThis.RealisticValence[Key]) || 1;
    if (V <= 0) return 1;
    const S = Math.min(1, BondOrderSum / V);
    return S * S * (3 - 2 * S);
};

Chemistry.BondAffinity = function (KeyA, KeyB) {
    if (NobleGasSet.has(KeyA) || NobleGasSet.has(KeyB)) return 0;
    if (KeyA === KeyB) return 0.72;
    const WantA = Chemistry.ElectronWant(KeyA);
    const WantB = Chemistry.ElectronWant(KeyB);
    const DonA = Chemistry.ElectronDonate(KeyA);
    const DonB = Chemistry.ElectronDonate(KeyB);
    const Donor = Math.max(DonA, DonB);
    const Acceptor = Math.max(WantA, WantB);
    const Shared = WantA * WantB * 0.25 + DonA * DonB * 0.15;
    return Math.min(1, Donor * Acceptor * 0.95 + Shared);
};

Chemistry.QuantumTunneling = function (ParticleEnergy, BarrierHeight) {
    if (BarrierHeight <= 0) return 1;
    const Ratio = Math.max(0.001, ParticleEnergy / BarrierHeight);
    if (Ratio >= 1) return 1;
    return Math.exp(-3.5 * (1 / Ratio - 1));
};

Chemistry.SpectralEmission = function (Z, ShellFrom, ShellTo) {
    if (ShellFrom <= ShellTo || ShellTo < 1) return null;
    const Rydberg = 13.6;
    const DeltaE = Rydberg * Z * Z * (1 / (ShellTo * ShellTo) - 1 / (ShellFrom * ShellFrom));
    const Lambda = 1239.84 / Math.max(0.001, DeltaE);
    return { wavelength: Lambda, energy: DeltaE };
};

Chemistry.BondEnthalpy = function (KeyA, KeyB, Order) {
    const Info = Chemistry.GetOrderedBondInfo(KeyA, KeyB, Order);
    if (Info) return Info.energy;
    const Aff = Chemistry.BondAffinity(KeyA, KeyB);
    return 180 * (0.5 + 0.5 * Aff);
};

Chemistry.AtomStabilityScore = function (Obj, BondOrderSum) {
    if (!Obj) return 0;
    if (Obj.Noble) return 1;
    return Chemistry.ChemicalStability(Obj.Key, BondOrderSum);
};