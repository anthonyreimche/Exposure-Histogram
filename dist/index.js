//#region src/ev.ts
var e = .18, t = Math.log2(1 / e), n = t - -10, r = n / 256;
function i(e) {
	return e <= .04045 ? e / 12.92 : ((e + .055) / 1.055) ** 2.4;
}
var a = i(254.5 / 255), o = i(.5 / 255), s = .001, c = [
	"r",
	"g",
	"b"
];
function l(t) {
	return Math.log2(t / e);
}
function u(e) {
	if (!(e > 0)) return 0;
	let t = Math.floor((l(e) - -10) / n * 256);
	return Math.min(255, Math.max(0, t));
}
function d() {
	let e = [];
	for (let r = -10; r < t; r++) e.push({
		ev: r,
		at: (r - -10) / n
	});
	return e;
}
function f(e, t) {
	let i = t * s, a = 0;
	for (let t = 255; t >= 0; t--) if (a += e[t], a > i) return (255 - t) * r;
	return n;
}
function p(e) {
	let t = Math.floor(e.length / 4);
	if (t === 0) return null;
	let n = c.map(() => /* @__PURE__ */ new Uint32Array(256)), r = [
		0,
		0,
		0
	], i = [
		0,
		0,
		0
	];
	for (let s = 0; s < t * 4; s += 4) for (let t = 0; t < 3; t++) {
		let c = e[s + t];
		n[t][u(c)]++, c >= a ? r[t]++ : c >= o || i[t]++;
	}
	let s = (e) => ({
		bins: n[e],
		over: r[e] / t,
		under: i[e] / t,
		headroom: f(n[e], t)
	});
	return {
		r: s(0),
		g: s(1),
		b: s(2),
		pixels: t
	};
}
//#endregion
//#region src/heights.ts
function m(e) {
	let t = 1;
	for (let n = 1; n < e.length - 1; n++) e[n] > t && (t = e[n]);
	return t;
}
function h(e, t, n) {
	let r = new Float32Array(e.length), i = Math.log1p(t);
	for (let a = 0; a < e.length; a++) {
		let o = n === "log" ? Math.log1p(e[a]) / i : e[a] / t;
		r[a] = Math.min(1, o);
	}
	return r;
}
var g = 32, _ = 84, v = 3;
function y(e) {
	return (e === "stacked" ? 102 : _) + 12;
}
var b = {
	r: "231,76,60",
	g: "46,204,113",
	b: "74,163,255"
}, x = {
	grid: "rgba(255,255,255,0.06)",
	label: "rgba(224,224,224,0.85)",
	clipShadow: "rgba(50,77,255,0.9)",
	clipHighlight: "rgba(255,50,50,0.9)"
}, S = {
	grid: "--histogram-grid",
	label: "--histogram-label",
	clipShadow: "--histogram-clip-shadow",
	clipHighlight: "--histogram-clip-highlight"
};
function C() {
	let e = getComputedStyle(document.documentElement), t = { ...x };
	for (let n of Object.keys(S)) {
		let r = e.getPropertyValue(S[n]).trim();
		r && (t[n] = r);
	}
	return t;
}
function w(e, t, n, r, i) {
	e.fillStyle = i, e.beginPath(), e.moveTo(0, n.y + n.h);
	for (let i = 0; i < r.length; i++) e.lineTo(i / (r.length - 1) * t, n.y + n.h - r[i] * (n.h - 1));
	e.lineTo(t, n.y + n.h), e.closePath(), e.fill();
}
function T(e, t, n, r) {
	for (let { ev: i, at: a } of d()) {
		if (i === -10) continue;
		let o = Math.round(a * t) + .5;
		e.strokeStyle = i === 0 ? r.label : r.grid, e.globalAlpha = i === 0 ? .3 : 1, e.beginPath(), e.moveTo(o, 0), e.lineTo(o, n), e.stroke();
	}
	e.globalAlpha = 1;
}
function ee(e, t, n, r) {
	e.fillStyle = r.label, e.font = "8px system-ui, sans-serif", e.textBaseline = "top";
	for (let { ev: r, at: i } of d()) r % 2 == 0 && (e.textAlign = r === -10 ? "left" : "center", e.fillText(r > 0 ? `+${r}` : `${r}`, i * t, n + 2));
	e.textAlign = "right", e.fillText("EV", t, n + 2);
}
function E(e, t, n, r, i, a) {
	r && (e.fillStyle = a.clipShadow, e.fillRect(0, n.y, v, n.h)), i && (e.fillStyle = a.clipHighlight, e.fillRect(t - v, n.y, v, n.h));
}
function D(e, t, n, r, i, a) {
	let o = y(r) - 12;
	if (e.clearRect(0, 0, t, o + 12), e.lineWidth = 1, T(e, t, o, a), ee(e, t, o, a), !n) return;
	if (r === "stacked") {
		c.forEach((r, o) => {
			let s = {
				y: o * 35,
				h: g
			}, c = n[r];
			w(e, t, s, h(c.bins, m(c.bins), i), `rgba(${b[r]},0.85)`), E(e, t, s, c.under > 0, c.over > 0, a);
		});
		return;
	}
	let s = {
		y: 0,
		h: o
	}, l = Math.max(...c.map((e) => m(n[e].bins)));
	e.globalCompositeOperation = "lighter";
	for (let r of c) w(e, t, s, h(n[r].bins, l, i), `rgba(${b[r]},0.7)`);
	e.globalCompositeOperation = "source-over";
	let u = (e) => c.some((t) => n[t][e] > 0);
	E(e, t, s, u("under"), u("over"), a);
}
//#endregion
//#region src/rt.ts
var O, k;
function A(e) {
	k = e, O = e.react;
}
//#endregion
//#region src/prefs.ts
var j = {
	source: "edited",
	layout: "stacked",
	scale: "linear"
}, te = {
	source: ["edited", "asShot"],
	layout: ["stacked", "overlay"],
	scale: ["linear", "log"]
};
function M(e, t) {
	let n = t(e, j[e]);
	return te[e].includes(n) ? n : j[e];
}
function ne(e) {
	return {
		source: M("source", e),
		layout: M("layout", e),
		scale: M("scale", e)
	};
}
function N() {
	return ne(k.settings.get);
}
function P(e, t) {
	k.settings.set(e, t);
}
function F() {
	for (let e of Object.keys(j)) k.settings.set(e, j[e]);
}
function I() {
	let [e, t] = O.useState(N);
	return O.useEffect(() => k.settings.onChange(() => t(N())), []), e;
}
function L(e) {
	let { develop: t, capture: n, paramsFor: r, publish: i } = e, a = e.throttleMs ?? 150, o = !1, s = !1, c = !1, l = null, u = -Infinity, d = 0;
	function f() {
		l = null;
		let e = t.getState();
		if (o || e.photoId === null) return;
		s = !0, u = Date.now();
		let a = d, f = () => !o && a === d;
		n(r(e)).then((e) => {
			f() && i(e ? p(e.data) : null);
		}, () => {
			f() && i(null);
		}).finally(() => {
			s = !1, c && !o && (c = !1, m());
		});
	}
	function m() {
		o || (s ? c = !0 : l === null && (l = setTimeout(f, Math.max(0, a - (Date.now() - u)))));
	}
	function h() {
		l !== null && clearTimeout(l), l = null;
	}
	let g = t.subscribe((e, t) => {
		e.photoId !== t.photoId && d++, e.photoId === null ? (c = !1, h(), i(null)) : (e.histogram !== t.histogram || e.photoId !== t.photoId) && m();
	});
	return m(), {
		stop() {
			o = !0, g(), h();
		},
		refresh() {
			d++, m();
		}
	};
}
//#endregion
//#region src/source.ts
function R(e, t, n) {
	return n({
		temperature: t,
		tint: 0,
		crop: e.crop,
		straighten: e.straighten,
		transform: e.transform,
		uprightMode: e.uprightMode,
		guidedLines: e.guidedLines,
		processVersion: e.processVersion
	});
}
function z(e, t, n) {
	return e === "asShot" ? R(t.params, t.asShotTemperature, n) : t.previewParams ?? t.params;
}
//#endregion
//#region src/live.ts
var B = { kind: "waiting" }, V = { kind: "none" }, H = 512, U = {
	encoding: "linear",
	primaries: "rec709"
}, W = B, G = /* @__PURE__ */ new Set();
function K(e) {
	W = e;
	for (let e of G) e();
}
function q() {
	return O.useSyncExternalStore((e) => (G.add(e), () => void G.delete(e)), () => W);
}
function J() {
	let e = N().source, t = L({
		develop: k.stores.useDevelopStore,
		capture: (e) => k.develop.captureFloatFrame(e, {
			point: "output",
			space: U,
			maxEdge: H
		}),
		paramsFor: (t) => z(e, t, k.develop.normalizeParams),
		publish: (e) => K(e ? {
			kind: "measured",
			measurement: e
		} : V)
	}), n = k.settings.onChange((n) => {
		n === "source" && (e = N().source, t.refresh());
	});
	return () => {
		n(), t.stop(), K(B);
	};
}
function Y(e) {
	let t = 0, n = null;
	return () => {
		t++ === 0 && (n = e());
		let r = !1;
		return () => {
			r || (r = !0, --t === 0 && (n?.(), n = null));
		};
	};
}
var X = Y(J), re = {
	r: "Red",
	g: "Green",
	b: "Blue"
}, ie = "var(--histogram-clip-highlight, rgba(255,50,50,0.9))", ae = "var(--histogram-clip-shadow, rgba(100,140,255,1))";
function Z(e) {
	return `${(e * 100).toFixed(2)} %`;
}
function Q(e) {
	let [t, n] = O.useState(256);
	return O.useEffect(() => {
		let t = e.current;
		if (!t || typeof ResizeObserver > "u") return;
		let r = new ResizeObserver((e) => {
			let t = Math.round(e[0].contentRect.width);
			t > 0 && n(t);
		});
		return r.observe(t), () => r.disconnect();
	}, [e]), t;
}
function oe({ measurement: e, prefs: t }) {
	let n = O.useRef(null), r = O.useRef(null), i = Q(n), a = y(t.layout);
	return O.useEffect(() => {
		let n = r.current;
		if (!n) return;
		let o = window.devicePixelRatio || 1;
		n.width = Math.round(i * o), n.height = Math.round(a * o);
		let s = n.getContext("2d");
		s && (s.setTransform(o, 0, 0, o, 0, 0), D(s, i, e, t.layout, t.scale, C()));
	}, [
		e,
		t.layout,
		t.scale,
		i,
		a
	]), /* @__PURE__ */ O.createElement("div", {
		ref: n,
		style: { width: "100%" }
	}, /* @__PURE__ */ O.createElement("canvas", {
		ref: r,
		"aria-label": "Exposure histogram",
		style: {
			display: "block",
			width: i,
			height: a,
			borderRadius: 4,
			background: k.ui.tokens.surface0
		}
	}));
}
function se({ measurement: e }) {
	let { tokens: t } = k.ui, n = {
		padding: "1px 0",
		textAlign: "right",
		fontVariantNumeric: "tabular-nums"
	}, r = {
		...n,
		fontWeight: 500,
		color: t.textMuted
	}, i = (e, n) => e > 0 ? n : t.textSecondary;
	return /* @__PURE__ */ O.createElement("table", { style: {
		width: "100%",
		borderCollapse: "collapse",
		fontSize: 10,
		color: t.textSecondary
	} }, /* @__PURE__ */ O.createElement("thead", null, /* @__PURE__ */ O.createElement("tr", null, /* @__PURE__ */ O.createElement("th", { style: r }), /* @__PURE__ */ O.createElement("th", {
		style: r,
		title: "Share of the channel's pixels at white"
	}, "Over"), /* @__PURE__ */ O.createElement("th", {
		style: r,
		title: "Share of the channel's pixels at black"
	}, "Under"), /* @__PURE__ */ O.createElement("th", {
		style: r,
		title: "Stops from the channel's brightest pixels up to white"
	}, "Headroom"))), /* @__PURE__ */ O.createElement("tbody", null, c.map((t) => {
		let a = e[t];
		return /* @__PURE__ */ O.createElement("tr", { key: t }, /* @__PURE__ */ O.createElement("th", {
			scope: "row",
			style: {
				...r,
				textAlign: "left"
			}
		}, re[t]), /* @__PURE__ */ O.createElement("td", { style: {
			...n,
			color: i(a.over, ie)
		} }, Z(a.over)), /* @__PURE__ */ O.createElement("td", { style: {
			...n,
			color: i(a.under, ae)
		} }, Z(a.under)), /* @__PURE__ */ O.createElement("td", { style: n }, `${a.headroom.toFixed(1)} EV`));
	})));
}
function ce() {
	let { SegmentedControl: e, tokens: t } = k.ui, n = k.stores.useDevelopStore((e) => e.photoId), r = I(), i = q();
	O.useEffect(() => X(), []);
	let a = n !== null && i.kind === "measured" ? i.measurement : null, o = null;
	return n === null ? o = "No photo open" : i.kind === "waiting" ? o = "Measuring…" : i.kind === "none" && (o = "No measurement: this graphics card can't read this frame back in floats."), /* @__PURE__ */ O.createElement("div", { style: {
		display: "flex",
		flexDirection: "column",
		gap: 6,
		padding: "8px 12px"
	} }, /* @__PURE__ */ O.createElement(oe, {
		measurement: a,
		prefs: r
	}), o === null ? a && /* @__PURE__ */ O.createElement(se, { measurement: a }) : /* @__PURE__ */ O.createElement("div", { style: {
		fontSize: 10,
		color: t.textMuted
	} }, o), /* @__PURE__ */ O.createElement(e, {
		size: "sm",
		value: r.source,
		onChange: (e) => P("source", e === "asShot" ? "asShot" : "edited"),
		options: [{
			value: "edited",
			label: "Edited",
			title: "The photo as the view shows it"
		}, {
			value: "asShot",
			label: "As shot",
			title: "The camera's exposure and white balance, before any edit"
		}]
	}), /* @__PURE__ */ O.createElement("div", { style: {
		display: "flex",
		gap: 6
	} }, /* @__PURE__ */ O.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ O.createElement(e, {
		size: "sm",
		value: r.layout,
		onChange: (e) => P("layout", e),
		options: [{
			value: "stacked",
			label: "Stacked"
		}, {
			value: "overlay",
			label: "Overlay"
		}]
	})), /* @__PURE__ */ O.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ O.createElement(e, {
		size: "sm",
		value: r.scale,
		onChange: (e) => P("scale", e === "log" ? "log" : "linear"),
		options: [{
			value: "linear",
			label: "Linear",
			title: "Bar heights by pixel count"
		}, {
			value: "log",
			label: "Log",
			title: "Bar heights by the log of the pixel count, so sparse tones show"
		}]
	}))));
}
//#endregion
//#region src/index.tsx
var $ = "exposure-histogram.panel", le = 1.2;
function ue(e) {
	A(e), e.registerPanel({
		id: $,
		title: "Exposure Histogram",
		component: ce,
		defaultDock: {
			module: "develop",
			direction: "right",
			order: le,
			width: 280
		},
		onReset: F
	});
}
//#endregion
export { $ as PANEL_ID, ue as activate };

//# sourceMappingURL=index.js.map