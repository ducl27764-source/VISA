import { useState, useRef, useMemo, useEffect } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid,
  Area, AreaChart
} from "recharts";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const P = "#F97316";
const PD = "#C2410C";
const PL = "#FFF7ED";
const PM = "#FED7AA";

const EXPENSE_CATS = [
  { id: "food",        name: "Ăn uống",           icon: "🍜", color: "#EF4444" },
  { id: "daily",       name: "Chi tiêu hàng ngày", icon: "🛒", color: "#3B82F6" },
  { id: "clothes",     name: "Quần áo",            icon: "👗", color: "#8B5CF6" },
  { id: "cosmetics",   name: "Mỹ phẩm",            icon: "💄", color: "#EC4899" },
  { id: "social",      name: "Phí giao lưu",       icon: "🎉", color: "#F59E0B" },
  { id: "health",      name: "Y tế",               icon: "🏥", color: "#10B981" },
  { id: "education",   name: "Giáo dục",           icon: "📚", color: "#06B6D4" },
  { id: "electricity", name: "Tiền điện",          icon: "⚡", color: "#EAB308" },
  { id: "travel",      name: "Đi lại",             icon: "🚗", color: "#6366F1" },
  { id: "phone",       name: "Phí liên lạc",       icon: "📱", color: "#14B8A6" },
  { id: "rent",        name: "Tiền nhà",           icon: "🏠", color: "#F97316" },
  { id: "other",       name: "Khác",               icon: "📌", color: "#6B7280" },
];

const INCOME_CATS = [
  { id: "salary",   name: "Lương",   icon: "💰", color: "#10B981" },
  { id: "bonus",    name: "Thưởng",  icon: "🎁", color: "#F59E0B" },
  { id: "invest",   name: "Đầu tư",  icon: "📈", color: "#3B82F6" },
  { id: "other_in", name: "Khác",    icon: "💵", color: "#6B7280" },
];

const ALL_CATS = [...EXPENSE_CATS, ...INCOME_CATS];
const getCat = (id) => ALL_CATS.find(c => c.id === id) || EXPENSE_CATS[11];

const fmt = (n) => new Intl.NumberFormat("vi-VN").format(Math.abs(n)) + "đ";
const fmtS = (n) => {
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " tỷ";
  if (a >= 1_000_000)     return (n / 1_000_000).toFixed(1) + " tr";
  if (a >= 1_000)         return (n / 1_000).toFixed(0) + " k";
  return n.toLocaleString("vi-VN") + "đ";
};

const toDay   = () => new Date().toISOString().slice(0, 10);
const toMonth = () => new Date().toISOString().slice(0, 7);
const DAYS   = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
                "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────
const INIT_BUDGETS = [
  { category: "food",        limit: 2000000 },
  { category: "daily",       limit: 1500000 },
  { category: "clothes",     limit: 800000  },
  { category: "travel",      limit: 500000  },
  { category: "electricity", limit: 700000  },
];

const INIT_DEBTS = [
  { id: 1, name: "Nguyễn Văn A",     amount: 500000,  remaining: 500000,  dueDate: "2025-06-01", type: "lent", note: "Cho mượn tiền ăn" },
  { id: 2, name: "Thẻ tín dụng VCB", amount: 2000000, remaining: 1500000, dueDate: "2025-05-25", type: "owed", note: "Trả thẻ tháng 5" },
];

// ─── AI AUTO-CATEGORISE ──────────────────────────────────────────────────────
const CAT_KW = {
  food:        ["ăn","cơm","phở","bún","café","cafe","cà phê","trà","bánh","pizza","lẩu","nướng","nhậu","quán"],
  travel:      ["grab","taxi","xăng","xe","bus","gojek","be","xe ôm","xăng dầu"],
  clothes:     ["quần","áo","giày","dép","thời trang","h&m","zara","uniqlo"],
  health:      ["thuốc","bác sĩ","khám","bệnh viện","y tế","pharmacy","nhà thuốc","bệnh"],
  education:   ["học","sách","khóa","học phí","trường","udemy","coursera"],
  electricity: ["điện","nước","gas","internet","wifi","điện nước"],
  cosmetics:   ["mỹ phẩm","kem","son","nước hoa","mac","innisfree","skincare"],
  social:      ["tiệc","giao lưu","sinh nhật","party","nhậu","bạn bè"],
  phone:       ["điện thoại","viettel","vinaphone","mobifone","nạp tiền","sim"],
  rent:        ["nhà","phòng trọ","thuê","chung cư","tiền nhà"],
};
const autoCateg = (note) => {
  const lower = note.toLowerCase();
  for (const [cat, words] of Object.entries(CAT_KW))
    if (words.some(w => lower.includes(w))) return cat;
  return null;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function shiftMonth(base, delta) {
  const [y, m] = base.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(m) {
  const [y, mo] = m.split("-");
  return `${MONTHS[parseInt(mo) - 1]} ${y}`;
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── State: dữ liệu lưu vào localStorage ──────────────────────────────────
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem("vcabn_transactions");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [budgets, setBudgets] = useState(() => {
    try {
      const saved = localStorage.getItem("vcabn_budgets");
      return saved ? JSON.parse(saved) : INIT_BUDGETS;
    } catch { return INIT_BUDGETS; }
  });

  const [debts, setDebts] = useState(() => {
    try {
      const saved = localStorage.getItem("vcabn_debts");
      return saved ? JSON.parse(saved) : INIT_DEBTS;
    } catch { return INIT_DEBTS; }
  });

  // Tự động lưu khi có thay đổi
  useEffect(() => {
    localStorage.setItem("vcabn_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("vcabn_budgets", JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem("vcabn_debts", JSON.stringify(debts));
  }, [debts]);

  // ── State: UI ─────────────────────────────────────────────────────────────
  const [tab,     setTab]     = useState("input");
  const [month,   setMonth]   = useState(toMonth());
  const [iType,   setIType]   = useState("expense");
  const [iAmt,    setIAmt]    = useState("");
  const [iCat,    setICat]    = useState("food");
  const [iNote,   setINote]   = useState("");
  const [iDate,   setIDate]   = useState(toDay());
  const [toast,   setToast]   = useState(null);
  const [catHint, setCatHint] = useState(false);
  const [bModal,  setBModal]  = useState(false);
  const [bCat,    setBCat]    = useState("food");
  const [bAmt,    setBAmt]    = useState("");
  const [dModal,  setDModal]  = useState(false);
  const [dForm,   setDForm]   = useState({ name:"", amount:"", dueDate:"", type:"owed", note:"" });
  const [delId,   setDelId]   = useState(null);

  // ── AI Chat ───────────────────────────────────────────────────────────────
  const [aiMsgs, setAiMsgs] = useState([{
    role: "assistant",
    content: "👋 Xin chào! Tôi là trợ lý tài chính AI.\n\nHỏi tôi bất cứ điều gì về thu chi, tiết kiệm, hay kế hoạch tài chính của bạn nhé! 💰"
  }]);
  const [aiIn,   setAiIn]   = useState("");
  const [aiLoad, setAiLoad] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [aiMsgs]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const monthTxn = useMemo(() =>
    transactions.filter(t => t.date.startsWith(month)), [transactions, month]);

  const totalInc = useMemo(() =>
    monthTxn.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0), [monthTxn]);

  const totalExp = useMemo(() =>
    monthTxn.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0), [monthTxn]);

  const balance = useMemo(() =>
    transactions.reduce((s, t) => t.type === "income" ? s + t.amount : s - t.amount, 0), [transactions]);

  const savingsRate = totalInc > 0 ? Math.round((totalInc - totalExp) / totalInc * 100) : 0;

  const catData = useMemo(() => {
    const m = {};
    monthTxn.filter(t => t.type === "expense").forEach(t => {
      m[t.category] = (m[t.category] || 0) + t.amount;
    });
    return Object.entries(m).map(([id, value]) => {
      const cat = getCat(id);
      return { id, name: cat.name, value, color: cat.color, icon: cat.icon, pct: totalExp ? Math.round(value / totalExp * 100) : 0 };
    }).sort((a, b) => b.value - a.value);
  }, [monthTxn, totalExp]);

  const budgetData = useMemo(() =>
    budgets.map(b => {
      const spent = monthTxn.filter(t => t.type === "expense" && t.category === b.category).reduce((s, t) => s + t.amount, 0);
      const cat = getCat(b.category);
      const pct = Math.min(100, Math.round(spent / b.limit * 100));
      return { ...b, spent, cat, pct, over: spent > b.limit };
    }), [budgets, monthTxn]);

  const alerts = useMemo(() => {
    const a = [];
    budgetData.forEach(b => { if (b.pct >= 90) a.push(`⚠️ ${b.cat.icon} ${b.cat.name}: ${b.pct}% ngân sách`); });
    debts.forEach(d => {
      const diff = Math.ceil((new Date(d.dueDate) - new Date()) / 864e5);
      if (diff >= 0 && diff <= 7 && d.type === "owed")
        a.push(`🔔 Trả nợ ${d.name}: ${fmtS(d.remaining)} (${diff}ngày)`);
    });
    return a;
  }, [budgetData, debts]);

  const grouped = useMemo(() => {
    const g = {};
    monthTxn.forEach(t => { (g[t.date] = g[t.date] || []).push(t); });
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [monthTxn]);

  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = shiftMonth(toMonth(), i - 5);
      const txns = transactions.filter(t => t.date.startsWith(m));
      return {
        name: m.slice(5) + "/" + m.slice(2, 4),
        income:  txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0) / 1_000_000,
        expense: txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0) / 1_000_000,
      };
    });
  }, [transactions]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleAmt = (val) => {
    const raw = val.replace(/[^0-9]/g, "");
    setIAmt(raw ? new Intl.NumberFormat("vi-VN").format(parseInt(raw)) : "");
  };

  const handleNote = (val) => {
    setINote(val);
    if (iType === "expense") {
      const s = autoCateg(val);
      if (s) { setICat(s); setCatHint(true); setTimeout(() => setCatHint(false), 2000); }
    }
  };

  const handleAdd = () => {
    const cleanStr = iAmt ? iAmt.toString().replace(/[^\d]/g, "") : "";
    const amt = parseInt(cleanStr, 10);
    if (!amt || isNaN(amt)) { showToast("Vui lòng nhập số tiền hợp lệ", "error"); return; }
    setTransactions(prev => [{
      id: Date.now(), date: iDate, amount: amt, type: iType,
      category: iType === "expense" ? iCat : "salary",
      note: iNote || (iType === "expense" ? "Chi tiêu" : "Thu nhập"),
    }, ...prev]);
    setIAmt(""); setINote("");
    showToast("🎉 Đã ghi thành công!");
  };

  // ✅ LỖI ĐÃ SỬA: dùng setTransactions thay vì setTxn
  const handleDel = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    setDelId(null);
    showToast("🗑️ Đã xóa giao dịch");
  };

  const saveBudget = () => {
    const amt = parseInt(bAmt.replace(/[^0-9]/g, ""));
    if (!amt) return;
    setBudgets(prev => {
      const ex = prev.find(b => b.category === bCat);
      return ex ? prev.map(b => b.category === bCat ? { ...b, limit: amt } : b) : [...prev, { category: bCat, limit: amt }];
    });
    setBModal(false); setBAmt(""); showToast("💼 Đã cập nhật ngân sách");
  };

  const saveDebt = () => {
    const amt = parseInt(String(dForm.amount).replace(/[^0-9]/g, ""));
    if (!amt || !dForm.name) { showToast("Điền đầy đủ thông tin", "error"); return; }
    setDebts(prev => [...prev, { ...dForm, id: Date.now(), amount: amt, remaining: amt }]);
    setDModal(false); setDForm({ name: "", amount: "", dueDate: "", type: "owed", note: "" });
    showToast("💸 Đã thêm khoản nợ");
  };

  const handleAIChat = async () => {
    if (!aiIn.trim() || aiLoad) return;
    const msg = aiIn.trim(); setAiIn("");
    setAiMsgs(p => [...p, { role: "user", content: msg }]);
    setAiLoad(true);
    const ctx = `Tháng ${month}: Thu=${fmt(totalInc)}, Chi=${fmt(totalExp)}, Số dư=${fmt(balance)}, Tiết kiệm=${savingsRate}%. Chi theo danh mục: ${catData.map(c => `${c.name} ${fmtS(c.value)}(${c.pct}%)`).join(", ")}. Ngân sách: ${budgetData.map(b => `${b.cat.name} ${fmtS(b.spent)}/${fmtS(b.limit)}`).join(", ")}. Nợ: ${debts.map(d => `${d.name} ${fmtS(d.remaining)} ${d.type === "owed" ? "(trả)" : "(đòi)"}`).join(", ")}. GD gần đây: ${transactions.slice(0, 6).map(t => `${t.date} ${t.type === "expense" ? "-" : "+"}${fmtS(t.amount)} ${t.note}`).join("; ")}.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `Bạn là trợ lý tài chính AI trong ứng dụng VCaBn Việt Nam. Trả lời tiếng Việt, ngắn gọn (≤180 từ), thân thiện, dùng emoji, đưa lời khuyên thực tế. Dữ liệu: ${ctx}`,
          messages: [{ role: "user", content: msg }]
        })
      });
      const data = await res.json();
      setAiMsgs(p => [...p, { role: "assistant", content: data.content?.[0]?.text || "Xin lỗi, thử lại nhé!" }]);
    } catch {
      setAiMsgs(p => [...p, { role: "assistant", content: "❌ Lỗi kết nối. Thử lại sau nhé!" }]);
    }
    setAiLoad(false);
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const css = {
    wrap:    { fontFamily: "'Segoe UI',system-ui,sans-serif", maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#F1F5F9", display: "flex", flexDirection: "column", position: "relative" },
    hdr:     { background: `linear-gradient(145deg,${P} 0%,${PD} 100%)`, color: "#fff", padding: "20px 20px 24px", borderRadius: "0 0 28px 28px", boxShadow: "0 4px 20px rgba(249,115,22,.35)" },
    card:    { background: "#fff", borderRadius: 20, padding: "16px", marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.06)" },
    btn:     (c = P, t = "#fff") => ({ background: c, color: t, border: "none", borderRadius: 14, padding: "14px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" }),
    inp:     { width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "12px 14px", fontSize: 15, outline: "none", boxSizing: "border-box", background: "#FAFAFA", fontFamily: "inherit" },
    tabBtn:  (a) => ({ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 2px 8px", cursor: "pointer", borderTop: `3px solid ${a ? P : "transparent"}`, color: a ? P : "#94A3B8", fontSize: 10, fontWeight: a ? 700 : 400, gap: 3, transition: "all .2s", background: "#fff" }),
    typeBtn: (a) => ({ flex: 1, padding: "10px 8px", borderRadius: 12, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", background: a ? P : "#F1F5F9", color: a ? "#fff" : "#64748B", transition: "all .2s" }),
    catBtn:  (a) => ({ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 6px", borderRadius: 14, border: `2.5px solid ${a ? P : "transparent"}`, background: a ? PL : "#F8FAFC", cursor: "pointer", minWidth: 62, gap: 3, transition: "all .2s" }),
    chip:    (c = P) => ({ fontSize: 11, padding: "3px 10px", borderRadius: 20, border: `1px solid ${c}`, background: "transparent", color: c, cursor: "pointer", fontFamily: "inherit" }),
  };

  const TABS = [
    { id: "input",  icon: "✏️",  label: "Nhập vào" },
    { id: "list",   icon: "📅",  label: "Lịch" },
    { id: "report", icon: "📊",  label: "Báo cáo" },
    { id: "budget", icon: "💼",  label: "Ngân sách" },
    { id: "more",   icon: "🤖",  label: "AI & Nợ" },
  ];

  return (
    <div style={css.wrap}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: toast.type === "error" ? "#FEE2E2" : "#D1FAE5", color: toast.type === "error" ? "#991B1B" : "#065F46", borderRadius: 14, padding: "10px 20px", fontWeight: 600, fontSize: 13, boxShadow: "0 4px 20px rgba(0,0,0,.15)", whiteSpace: "nowrap", animation: "slideDown .3s ease" }}>
          {toast.msg}
        </div>
      )}

      {/* Alert Banner */}
      {alerts.length > 0 && (
        <div style={{ background: "#FEF3C7", padding: "8px 16px", fontSize: 12, color: "#92400E", display: "flex", gap: 12, overflowX: "auto", flexShrink: 0 }}>
          {alerts.map((a, i) => <span key={i} style={{ whiteSpace: "nowrap" }}>{a}</span>)}
        </div>
      )}

      {/* ══ INPUT TAB ══ */}
      {tab === "input" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={css.hdr}>
            <p style={{ margin: 0, fontSize: 12, opacity: .8, letterSpacing: 1, textTransform: "uppercase" }}>Số dư tích lũy</p>
            <h1 style={{ margin: "4px 0 0", fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>{fmt(balance)}</h1>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              {[["↑ Thu", "#A7F3D0", totalInc], ["↓ Chi", "#FCA5A5", totalExp], ["= Còn", totalInc - totalExp >= 0 ? "#A7F3D0" : "#FCA5A5", totalInc - totalExp]].map(([l, c, v]) => (
                <div key={l} style={{ background: "rgba(255,255,255,.15)", borderRadius: 12, padding: "8px 12px", flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 11, opacity: .8 }}>{l}</p>
                  <p style={{ margin: "2px 0 0", fontWeight: 700, fontSize: 14, color: c }}>{fmtS(v)}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: 16 }}>
            {/* Savings rate card */}
            {totalInc > 0 && (
              <div style={{ ...css.card, background: savingsRate >= 20 ? "linear-gradient(135deg,#D1FAE5,#A7F3D0)" : "linear-gradient(135deg,#FEE2E2,#FCA5A5)", padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: "#475569", fontWeight: 600 }}>Tỷ lệ tiết kiệm tháng này</p>
                    <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: savingsRate >= 20 ? "#065F46" : "#991B1B" }}>{savingsRate}%</p>
                  </div>
                  <span style={{ fontSize: 36 }}>{savingsRate >= 30 ? "🏆" : savingsRate >= 20 ? "✅" : savingsRate >= 0 ? "⚠️" : "🚨"}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(0,0,0,.1)", marginTop: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, savingsRate))}%`, borderRadius: 3, background: savingsRate >= 20 ? "#10B981" : "#EF4444" }} />
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#475569" }}>{savingsRate >= 20 ? "Tốt! Tiếp tục duy trì nhé 🎉" : "Mục tiêu tiết kiệm 20% thu nhập"}</p>
              </div>
            )}

            <div style={css.card}>
              <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#F1F5F9", borderRadius: 14, padding: 4 }}>
                <button style={css.typeBtn(iType === "expense")} onClick={() => { setIType("expense"); setICat("food"); }}>🔴 Chi tiêu</button>
                <button style={css.typeBtn(iType === "income")}  onClick={() => { setIType("income"); setICat("salary"); }}>🟢 Thu nhập</button>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, letterSpacing: .5, display: "block", marginBottom: 5 }}>SỐ TIỀN</label>
                <input style={{ ...css.inp, fontSize: 26, fontWeight: 800, color: iType === "expense" ? "#EF4444" : "#10B981", textAlign: "right", letterSpacing: -1 }}
                  placeholder="0đ" value={iAmt} onChange={e => handleAmt(e.target.value)} inputMode="numeric" />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, letterSpacing: .5, display: "block", marginBottom: 5 }}>NGÀY</label>
                <input type="date" style={css.inp} value={iDate} onChange={e => setIDate(e.target.value)} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, letterSpacing: .5, display: "block", marginBottom: 5 }}>
                  GHI CHÚ &nbsp;<span style={{ color: P, fontWeight: 500, fontSize: 11, textTransform: "none", letterSpacing: 0 }}>✨ AI tự phân loại</span>
                </label>
                <input style={css.inp} placeholder='VD: "Ăn phở bò", "Grab đi làm", "Lương tháng 5"…'
                  value={iNote} onChange={e => handleNote(e.target.value)} />
                {catHint && <p style={{ margin: "4px 0 0", fontSize: 11, color: P, fontWeight: 600 }}>✨ Đã nhận diện: {getCat(iCat).icon} {getCat(iCat).name}</p>}
              </div>

              {iType === "expense" && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, letterSpacing: .5, display: "block", marginBottom: 8 }}>DANH MỤC</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {EXPENSE_CATS.map(cat => (
                      <button key={cat.id} style={css.catBtn(iCat === cat.id)} onClick={() => setICat(cat.id)}>
                        <span style={{ fontSize: 22 }}>{cat.icon}</span>
                        <span style={{ fontSize: 9, color: iCat === cat.id ? PD : "#64748B", textAlign: "center", lineHeight: 1.2, maxWidth: 54, wordBreak: "break-word" }}>
                          {cat.name.length > 9 ? cat.name.slice(0, 8) + "…" : cat.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {iType === "income" && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, letterSpacing: .5, display: "block", marginBottom: 8 }}>LOẠI THU NHẬP</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {INCOME_CATS.map(cat => (
                      <button key={cat.id} style={css.catBtn(iCat === cat.id)} onClick={() => setICat(cat.id)}>
                        <span style={{ fontSize: 22 }}>{cat.icon}</span>
                        <span style={{ fontSize: 10, color: iCat === cat.id ? PD : "#64748B" }}>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button style={css.btn()} onClick={handleAdd}>
                {iType === "expense" ? "📝 Ghi chi tiêu" : "💰 Ghi thu nhập"}
              </button>
            </div>

            {transactions.slice(0, 3).length > 0 && (
              <div style={css.card}>
                <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#475569" }}>Giao dịch vừa thêm</p>
                {transactions.slice(0, 3).map(t => {
                  const cat = getCat(t.category);
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #F1F5F9" }}>
                      <span style={{ fontSize: 20 }}>{cat.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{t.note}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#94A3B8" }}>{t.date}</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: t.type === "expense" ? "#EF4444" : "#10B981" }}>
                        {t.type === "expense" ? "-" : "+"}{fmtS(t.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ LIST TAB ══ */}
      {tab === "list" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={css.hdr}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button onClick={() => setMonth(m => shiftMonth(m, -1))} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 18, fontWeight: 700 }}>‹</button>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{monthLabel(month)}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, opacity: .85 }}>Thu: {fmtS(totalInc)} · Chi: {fmtS(totalExp)} · Còn: {fmtS(totalInc - totalExp)}</p>
              </div>
              <button onClick={() => setMonth(m => shiftMonth(m, 1))} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 18, fontWeight: 700 }}>›</button>
            </div>
          </div>
          <div style={{ padding: "12px 16px" }}>
            {grouped.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#94A3B8" }}>
                <p style={{ fontSize: 50, margin: 0 }}>📭</p>
                <p style={{ fontSize: 15, marginTop: 8 }}>Chưa có giao dịch tháng này</p>
                <button style={{ ...css.btn(P), width: "auto", padding: "10px 24px", marginTop: 8 }} onClick={() => setTab("input")}>+ Thêm giao dịch</button>
              </div>
            ) : grouped.map(([date, txns]) => {
              const dayTotal = txns.reduce((s, t) => t.type === "expense" ? s - t.amount : s + t.amount, 0);
              const d = new Date(date + "T00:00:00");
              return (
                <div key={date} style={css.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #F1F5F9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ background: P, color: "#fff", borderRadius: 10, width: 36, height: 36, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1 }}>{date.slice(8)}</span>
                        <span style={{ fontSize: 8, opacity: .85 }}>{DAYS[d.getDay()]}</span>
                      </div>
                      <span style={{ fontSize: 12, color: "#64748B" }}>{date.slice(5, 7)}/{date.slice(0, 4)}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: dayTotal >= 0 ? "#10B981" : "#EF4444" }}>
                      {dayTotal >= 0 ? "+" : ""}{fmtS(dayTotal)}
                    </span>
                  </div>
                  {txns.map(t => {
                    const cat = getCat(t.category);
                    return (
                      <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #F8FAFC" }}>
                        <div style={{ width: 38, height: 38, borderRadius: 12, background: cat.color + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 20 }}>{cat.icon}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.note}</p>
                          <p style={{ margin: 0, fontSize: 11, color: "#94A3B8" }}>{cat.name}</p>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: t.type === "expense" ? "#EF4444" : "#10B981", flexShrink: 0 }}>
                          {t.type === "expense" ? "-" : "+"}{fmt(t.amount)}
                        </span>
                        <button onClick={() => setDelId(t.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#CBD5E1", padding: "4px", flexShrink: 0 }}>🗑</button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ REPORT TAB ══ */}
      {tab === "report" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={css.hdr}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <button onClick={() => setMonth(m => shiftMonth(m, -1))} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 18 }}>‹</button>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16 }}>📊 Báo cáo {monthLabel(month)}</p>
              <button onClick={() => setMonth(m => shiftMonth(m, 1))} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 18 }}>›</button>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {[["Thu nhập", "#A7F3D0", totalInc], ["Chi tiêu", "#FCA5A5", totalExp], ["Tiết kiệm", totalInc - totalExp >= 0 ? "#A7F3D0" : "#FCA5A5", totalInc - totalExp]].map(([l, c, v]) => (
                <div key={l} style={{ flex: 1, background: "rgba(255,255,255,.15)", borderRadius: 12, padding: "10px 12px" }}>
                  <p style={{ margin: 0, fontSize: 11, opacity: .8 }}>{l}</p>
                  <p style={{ margin: "3px 0 0", fontWeight: 800, fontSize: 14, color: c }}>{fmtS(v)}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: "12px 16px" }}>
            {totalInc > 0 && (
              <div style={{ ...css.card, background: savingsRate >= 20 ? "#F0FDF4" : "#FFF1F2" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Tỷ lệ tiết kiệm</p>
                    <p style={{ margin: "2px 0 0", fontSize: 24, fontWeight: 800, color: savingsRate >= 20 ? "#10B981" : "#EF4444" }}>{savingsRate}%</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748B" }}>Khuyến nghị: ≥ 20%</p>
                  </div>
                  <div style={{ width: 70, height: 70, borderRadius: "50%", background: savingsRate >= 20 ? "#D1FAE5" : "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
                    {savingsRate >= 30 ? "🏆" : savingsRate >= 20 ? "😊" : savingsRate >= 0 ? "😐" : "😰"}
                  </div>
                </div>
              </div>
            )}
            {catData.length > 0 ? (
              <div style={css.card}>
                <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>Chi tiêu theo danh mục</h3>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: "#94A3B8" }}>Tổng: {fmt(totalExp)}</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                      {catData.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} labelFormatter={() => ""} />
                  </PieChart>
                </ResponsiveContainer>
                {catData.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13 }}>{c.icon} {c.name}</span>
                    <div style={{ width: 80, height: 5, borderRadius: 3, background: "#F1F5F9", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${c.pct}%`, background: c.color, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, color: "#64748B", width: 28, textAlign: "right" }}>{c.pct}%</span>
                    <span style={{ fontSize: 13, fontWeight: 700, width: 60, textAlign: "right" }}>{fmtS(c.value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ ...css.card, textAlign: "center", color: "#94A3B8", padding: "32px" }}>
                <p style={{ fontSize: 40, margin: 0 }}>📊</p><p>Chưa có dữ liệu chi tiêu</p>
              </div>
            )}
            <div style={css.card}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>Xu hướng 6 tháng (triệu đ)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={.3} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                    <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={P} stopOpacity={.3} /><stop offset="95%" stopColor={P} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => v.toFixed(1) + "tr"} />
                  <Area type="monotone" dataKey="income" stroke="#10B981" fill="url(#gi)" strokeWidth={2} name="Thu nhập" dot={false} />
                  <Area type="monotone" dataKey="expense" stroke={P} fill="url(#ge)" strokeWidth={2} name="Chi tiêu" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
                <span style={{ fontSize: 12, color: "#10B981" }}>■ Thu nhập</span>
                <span style={{ fontSize: 12, color: P }}>■ Chi tiêu</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ BUDGET TAB ══ */}
      {tab === "budget" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={css.hdr}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>💼 Quản lý ngân sách</h2>
            <p style={{ margin: "4px 0 0", opacity: .8, fontSize: 13 }}>{monthLabel(month)}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <div style={{ background: "rgba(255,255,255,.15)", borderRadius: 12, padding: "8px 14px", flex: 1 }}>
                <p style={{ margin: 0, fontSize: 11, opacity: .8 }}>Tổng ngân sách</p>
                <p style={{ margin: "2px 0 0", fontWeight: 700 }}>{fmtS(budgets.reduce((s, b) => s + b.limit, 0))}</p>
              </div>
              <div style={{ background: "rgba(255,255,255,.15)", borderRadius: 12, padding: "8px 14px", flex: 1 }}>
                <p style={{ margin: 0, fontSize: 11, opacity: .8 }}>Đã chi (có NS)</p>
                <p style={{ margin: "2px 0 0", fontWeight: 700, color: "#FCA5A5" }}>{fmtS(budgetData.reduce((s, b) => s + b.spent, 0))}</p>
              </div>
            </div>
          </div>
          <div style={{ padding: "12px 16px" }}>
            {budgetData.map(b => (
              <div key={b.category} style={{ ...css.card, borderLeft: `4px solid ${b.over ? "#EF4444" : b.pct > 70 ? "#F59E0B" : "#10B981"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: b.cat.color + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 24 }}>{b.cat.icon}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{b.cat.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: b.over ? "#EF4444" : "#64748B" }}>{fmt(b.spent)} / {fmt(b.limit)}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: b.over ? "#EF4444" : b.pct > 70 ? "#F59E0B" : "#10B981" }}>{b.pct}%</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#94A3B8" }}>sử dụng</p>
                  </div>
                </div>
                <div style={{ height: 10, borderRadius: 6, background: "#F1F5F9", overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: "100%", width: `${b.pct}%`, borderRadius: 6, background: b.over ? "#EF4444" : b.pct > 70 ? "#F59E0B" : "#10B981", transition: "width .6s ease" }} />
                </div>
                {b.over
                  ? <p style={{ margin: "4px 0 0", fontSize: 11, color: "#EF4444", fontWeight: 600 }}>⚠️ Vượt ngân sách {fmt(b.spent - b.limit)}!</p>
                  : <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94A3B8" }}>Còn lại: {fmt(b.limit - b.spent)}</p>
                }
              </div>
            ))}
            <button style={css.btn()} onClick={() => setBModal(true)}>+ Thêm / sửa ngân sách</button>
            {catData.filter(c => !budgets.find(b => b.category === c.id)).length > 0 && (
              <div style={{ ...css.card, marginTop: 4 }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#475569" }}>Danh mục chưa có ngân sách</p>
                {catData.filter(c => !budgets.find(b => b.category === c.id)).map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #F1F5F9" }}>
                    <span style={{ fontSize: 20 }}>{c.icon}</span>
                    <span style={{ flex: 1, fontSize: 13 }}>{c.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#EF4444" }}>{fmt(c.value)}</span>
                    <button onClick={() => { setBCat(c.id); setBModal(true); }} style={{ ...css.chip(), padding: "3px 10px", background: PL, border: "none" }}>+ NS</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MORE TAB ══ */}
      {tab === "more" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={css.hdr}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>🤖 AI Tài chính & Vay nợ</h2>
            <p style={{ margin: "4px 0 0", opacity: .8, fontSize: 13 }}>Trợ lý thông minh powered by Claude AI</p>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <div style={css.card}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: `linear-gradient(135deg,${P},${PD})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Trợ lý AI Tài chính</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#10B981", fontWeight: 600 }}>● Claude AI</p>
                </div>
              </div>
              <div ref={chatRef} style={{ height: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12, padding: "4px 0" }}>
                {aiMsgs.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                    {m.role === "assistant" && <div style={{ width: 28, height: 28, borderRadius: 10, background: `linear-gradient(135deg,${P},${PD})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>}
                    <div style={{ maxWidth: "82%", padding: "10px 14px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.role === "user" ? `linear-gradient(135deg,${P},${PD})` : "#F1F5F9", color: m.role === "user" ? "#fff" : "#1E293B", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {aiLoad && (
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 10, background: `linear-gradient(135deg,${P},${PD})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
                    <div style={{ background: "#F1F5F9", padding: "12px 16px", borderRadius: "18px 18px 18px 4px", fontSize: 13, color: "#64748B" }}>⏳ Đang phân tích dữ liệu…</div>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {["Tháng này tôi chi nhiều nhất vào đâu?", "Lời khuyên tiết kiệm", "Dự báo cuối tháng", "So sánh với tháng trước"].map(q => (
                  <button key={q} onClick={() => setAiIn(q)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, border: `1px solid ${PM}`, background: PL, color: PD, cursor: "pointer", fontFamily: "inherit" }}>{q}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...css.inp, flex: 1, borderRadius: 30, padding: "12px 16px" }} placeholder="Hỏi về tài chính của bạn…" value={aiIn} onChange={e => setAiIn(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAIChat()} />
                <button onClick={handleAIChat} disabled={aiLoad} style={{ background: aiLoad ? "#CBD5E1" : `linear-gradient(135deg,${P},${PD})`, border: "none", color: "#fff", borderRadius: 30, padding: "0 20px", cursor: aiLoad ? "default" : "pointer", fontSize: 20, flexShrink: 0 }}>↑</button>
              </div>
            </div>

            <div style={css.card}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>💸 Quản lý vay nợ</h3>
                  <p style={{ margin: 0, fontSize: 11, color: "#94A3B8" }}>Cần trả: {fmtS(debts.filter(d => d.type === "owed").reduce((s, d) => s + d.remaining, 0))} · Cần đòi: {fmtS(debts.filter(d => d.type === "lent").reduce((s, d) => s + d.remaining, 0))}</p>
                </div>
                <button onClick={() => setDModal(true)} style={{ marginLeft: "auto", background: `linear-gradient(135deg,${P},${PD})`, border: "none", color: "#fff", borderRadius: 10, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>+ Thêm</button>
              </div>
              {debts.length === 0 && <p style={{ color: "#94A3B8", textAlign: "center", fontSize: 13, padding: "20px 0" }}>Không có khoản nợ nào 🎉</p>}
              {debts.map(d => {
                const diff = Math.ceil((new Date(d.dueDate) - new Date()) / 864e5);
                const paid = d.amount - d.remaining;
                const pct = Math.round(paid / d.amount * 100);
                return (
                  <div key={d.id} style={{ padding: "12px 0", borderBottom: "1px solid #F1F5F9" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: d.type === "owed" ? "#FEE2E2" : "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{d.type === "owed" ? "🔴" : "🟢"}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{d.name}</p>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: d.type === "owed" ? "#EF4444" : "#10B981" }}>{fmt(d.remaining)}</p>
                            <p style={{ margin: 0, fontSize: 10, color: "#94A3B8" }}>{d.type === "owed" ? "Cần trả" : "Cần đòi"}</p>
                          </div>
                        </div>
                        <p style={{ margin: "2px 0", fontSize: 11, color: "#64748B" }}>{d.note}</p>
                        <p style={{ margin: 0, fontSize: 11, color: diff <= 7 && diff >= 0 ? "#EF4444" : diff < 0 ? "#94A3B8" : "#64748B", fontWeight: diff <= 7 && diff >= 0 ? 600 : 400 }}>
                          📅 Hạn {d.dueDate} {diff < 0 ? "(Đã hết hạn!)" : diff <= 7 ? `⚠️ Còn ${diff} ngày` : ""}
                        </p>
                      </div>
                    </div>
                    <div style={{ height: 7, borderRadius: 4, background: "#F1F5F9", overflow: "hidden", marginBottom: 4 }}>
                      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: d.type === "owed" ? "#EF4444" : "#10B981" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <p style={{ margin: 0, fontSize: 11, color: "#94A3B8" }}>Đã TT: {fmt(paid)} / {fmt(d.amount)} ({pct}%)</p>
                      {d.remaining > 0 && (
                        <button onClick={() => {
                          const payAmt = parseInt(prompt(`Thanh toán bao nhiêu? (Còn ${fmt(d.remaining)})`, "") || "0");
                          if (payAmt > 0) { setDebts(p => p.map(x => x.id === d.id ? { ...x, remaining: Math.max(0, x.remaining - payAmt) } : x)); showToast("✅ Đã cập nhật thanh toán"); }
                        }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 10, border: `1px solid ${P}`, background: PL, color: PD, cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>Thanh toán</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ BUDGET MODAL ══ */}
      {bModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", display: "flex", alignItems: "flex-end", zIndex: 200, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", borderRadius: "28px 28px 0 0", padding: 24, width: "100%", maxWidth: 480, margin: "0 auto", boxShadow: "0 -8px 40px rgba(0,0,0,.2)" }}>
            <div style={{ width: 36, height: 4, background: "#E2E8F0", borderRadius: 2, margin: "0 auto 20px" }} />
            <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 800 }}>Đặt ngân sách</h3>
            <label style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, display: "block", marginBottom: 6 }}>DANH MỤC</label>
            <select style={{ ...css.inp, marginBottom: 12 }} value={bCat} onChange={e => setBCat(e.target.value)}>
              {EXPENSE_CATS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <label style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, display: "block", marginBottom: 6 }}>GIỚI HẠN (đ)</label>
            <input style={{ ...css.inp, marginBottom: 20, fontSize: 20, fontWeight: 700 }} placeholder="VD: 2,000,000" value={bAmt} onChange={e => handleAmt(e.target.value)} inputMode="numeric" />
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...css.btn("#F1F5F9", "#475569"), flex: 1 }} onClick={() => setBModal(false)}>Hủy</button>
              <button style={{ ...css.btn(), flex: 1 }} onClick={saveBudget}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DEBT MODAL ══ */}
      {dModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", display: "flex", alignItems: "flex-end", zIndex: 200, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", borderRadius: "28px 28px 0 0", padding: 24, width: "100%", maxWidth: 480, margin: "0 auto", boxShadow: "0 -8px 40px rgba(0,0,0,.2)" }}>
            <div style={{ width: 36, height: 4, background: "#E2E8F0", borderRadius: 2, margin: "0 auto 20px" }} />
            <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 800 }}>Thêm khoản vay nợ</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, background: "#F1F5F9", borderRadius: 14, padding: 4 }}>
              <button style={css.typeBtn(dForm.type === "owed")} onClick={() => setDForm(f => ({ ...f, type: "owed" }))}>🔴 Tôi nợ</button>
              <button style={css.typeBtn(dForm.type === "lent")} onClick={() => setDForm(f => ({ ...f, type: "lent" }))}>🟢 Người khác nợ tôi</button>
            </div>
            {[["Tên người / tổ chức", "name", "text"], ["Số tiền", "amount", "numeric"], ["Ngày đến hạn", "dueDate", "date"], ["Ghi chú", "note", "text"]].map(([label, key, mode]) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, display: "block", marginBottom: 4 }}>{label.toUpperCase()}</label>
                <input type={mode === "date" ? "date" : "text"} style={css.inp} placeholder={label}
                  value={dForm[key]} inputMode={mode} onChange={e => setDForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button style={{ ...css.btn("#F1F5F9", "#475569"), flex: 1 }} onClick={() => setDModal(false)}>Hủy</button>
              <button style={{ ...css.btn(), flex: 1 }} onClick={saveDebt}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM ══ */}
      {delId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", borderRadius: 24, padding: 24, width: 300, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            <p style={{ fontSize: 40, margin: "0 0 8px" }}>🗑️</p>
            <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>Xóa giao dịch này?</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748B" }}>Hành động này không thể hoàn tác.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...css.btn("#F1F5F9", "#475569"), flex: 1 }} onClick={() => setDelId(null)}>Hủy</button>
              <button style={{ ...css.btn("#EF4444"), flex: 1 }} onClick={() => handleDel(delId)}>Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ BOTTOM TABS ══ */}
      <div style={{ display: "flex", borderTop: "1px solid #F1F5F9", position: "sticky", bottom: 0, zIndex: 50, background: "#fff", boxShadow: "0 -4px 20px rgba(0,0,0,.06)" }}>
        {TABS.map(t => (
          <div key={t.id} style={css.tabBtn(tab === t.id)} onClick={() => setTab(t.id)}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span>{t.label}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideDown { from{opacity:0;transform:translateX(-50%) translateY(-10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:2px; }
        * { -webkit-tap-highlight-color:transparent; box-sizing:border-box; }
      `}</style>
    </div>
  );
}
