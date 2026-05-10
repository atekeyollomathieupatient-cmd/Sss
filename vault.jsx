// ─── IMPORTS ─────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ─── FIREBASE INIT ────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBffKAg7gLQ9hUfVDbmfaYK2uaQr5U2mxs",
  authDomain: "mds-novatech.firebaseapp.com",
  projectId: "mds-novatech",
  storageBucket: "mds-novatech.firebasestorage.app",
  messagingSenderId: "9720867259",
  appId: "1:9720867259:web:0b9a085994d2bc3f9a3c9e",
  measurementId: "G-9KH3JWHW9C"
};

const fbApp  = initializeApp(firebaseConfig);
const auth   = getAuth(fbApp);
const db     = getFirestore(fbApp);
const storage = getStorage(fbApp);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id:"all",      label:"Tout",      fa:"fa-solid fa-layer-group" },
  { id:"document", label:"Documents", fa:"fa-solid fa-file-lines" },
  { id:"image",    label:"Images",    fa:"fa-solid fa-image" },
  { id:"video",    label:"Vidéos",    fa:"fa-solid fa-clapperboard" },
  { id:"audio",    label:"Audio",     fa:"fa-solid fa-music" },
];

const UPLOAD_BTNS = [
  { type:"document", label:"Document", fa:"fa-solid fa-file-arrow-up",    color:"#3b82f6", accept:".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv" },
  { type:"image",    label:"Image",    fa:"fa-solid fa-image",             color:"#10b981", accept:"image/*" },
  { type:"video",    label:"Vidéo",    fa:"fa-solid fa-video",             color:"#f59e0b", accept:"video/*" },
  { type:"audio",    label:"Audio",    fa:"fa-solid fa-microphone-lines",  color:"#ec4899", accept:"audio/*" },
];

const CAT_COLORS = {
  document:{ bg:"rgba(59,130,246,.12)",  icon:"#60a5fa", fa:"fa-solid fa-file-lines" },
  image:   { bg:"rgba(16,185,129,.12)",  icon:"#34d399", fa:"fa-solid fa-image" },
  video:   { bg:"rgba(245,158,11,.12)",  icon:"#fbbf24", fa:"fa-solid fa-clapperboard" },
  audio:   { bg:"rgba(236,72,153,.12)",  icon:"#f472b6", fa:"fa-solid fa-music" },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getCategory(mime="", name="") {
  const ext = name.split(".").pop().toLowerCase();
  if (["pdf","doc","docx","txt","xls","xlsx","ppt","pptx","csv"].includes(ext)) return "document";
  if (["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext)) return "image";
  if (["mp4","mov","avi","mkv","webm"].includes(ext)) return "video";
  if (["mp3","wav","ogg","flac","aac","m4a"].includes(ext)) return "audio";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

function formatSize(b) {
  if (!b) return "—";
  if (b < 1024) return b + " o";
  if (b < 1048576) return (b/1024).toFixed(1) + " Ko";
  if (b < 1073741824) return (b/1048576).toFixed(1) + " Mo";
  return (b/1073741824).toFixed(2) + " Go";
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const G = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
  body { background:#080b14; overscroll-behavior:none; }
  ::-webkit-scrollbar { display:none; }
  input::placeholder { color:#334155; }
  button:active { opacity:.82; transform:scale(.98); }
  @keyframes toastIn {
    from { opacity:0; transform:translateX(-50%) translateY(18px) scale(.94); }
    to   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
  }
  @keyframes fadeIn  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin    { to { transform:rotate(360deg); } }
  @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.8} }
`;

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  const bg = type==="error" ? "#ef4444" : type==="info" ? "#6366f1" : "#10b981";
  return (
    <div style={{
      position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
      background:bg, color:"#fff", padding:"11px 22px", borderRadius:40,
      fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:14,
      zIndex:9999, boxShadow:"0 8px 32px rgba(0,0,0,.45)",
      animation:"toastIn .3s cubic-bezier(.34,1.56,.64,1) both",
      maxWidth:"88vw", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"
    }}>{msg}</div>
  );
}

// ─── FIELD ────────────────────────────────────────────────────────────────────
function Field({ icon, type="text", value, onChange, placeholder, onKeyDown, right, onRight }) {
  return (
    <div style={{ position:"relative" }}>
      <i className={icon} style={{ position:"absolute", left:15, top:"50%", transform:"translateY(-50%)", color:"#475569", fontSize:15 }} />
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
        style={{ width:"100%", background:"#111827", border:"1px solid #1e293b", borderRadius:13,
          padding:"14px 44px", color:"#f1f5ff", fontSize:15,
          fontFamily:"'Plus Jakarta Sans',sans-serif", outline:"none" }} />
      {right && (
        <button onClick={onRight} style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)",
          background:"none", border:"none", color:"#475569", cursor:"pointer", padding:6 }}>
          <i className={right} style={{ fontSize:16 }} />
        </button>
      )}
    </div>
  );
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
function ProgressBar({ value }) {
  return (
    <div style={{ background:"#1e293b", borderRadius:99, height:6, overflow:"hidden", marginTop:6 }}>
      <div style={{ width:`${value}%`, height:"100%", borderRadius:99,
        background:"linear-gradient(90deg,#6366f1,#ec4899)", transition:"width .2s" }} />
    </div>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onLogin, showToast }) {
  const [mode, setMode] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [busy, setBusy]         = useState(false);
  const [showPw, setShowPw]     = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) { showToast("Remplis tous les champs", "error"); return; }
    if (mode==="register" && !displayName.trim()) { showToast("Entre ton prénom", "error"); return; }
    if (mode==="register" && password !== confirm) { showToast("Mots de passe différents", "error"); return; }
    if (mode==="register" && password.length < 6)  { showToast("Min. 6 caractères", "error"); return; }
    setBusy(true);
    try {
      if (mode==="register") {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: displayName.trim() });
        showToast(`Bienvenue ${displayName.trim()} 🎉`);
        onLogin(cred.user);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        showToast("Connexion réussie !");
        onLogin(cred.user);
      }
    } catch (e) {
      const msgs = {
        "auth/email-already-in-use":   "Email déjà utilisé",
        "auth/user-not-found":         "Utilisateur introuvable",
        "auth/wrong-password":         "Mot de passe incorrect",
        "auth/invalid-email":          "Email invalide",
        "auth/invalid-credential":     "Email ou mot de passe incorrect",
        "auth/too-many-requests":      "Trop de tentatives, réessaie plus tard",
      };
      showToast(msgs[e.code] || "Erreur : " + e.message, "error");
    }
    setBusy(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#080b14", display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"28px 20px", fontFamily:"'Plus Jakarta Sans',sans-serif", overflow:"hidden" }}>

      <div style={{ position:"absolute", top:"-20%", left:"-15%", width:380, height:380,
        background:"radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 70%)",
        borderRadius:"50%", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"-15%", right:"-15%", width:340, height:340,
        background:"radial-gradient(circle,rgba(236,72,153,.18) 0%,transparent 70%)",
        borderRadius:"50%", pointerEvents:"none" }} />

      <div style={{ width:"100%", maxWidth:400, position:"relative", animation:"fadeIn .5s ease both" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:68, height:68, borderRadius:22, margin:"0 auto 16px",
            background:"linear-gradient(135deg,#6366f1,#ec4899)",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 16px 48px rgba(99,102,241,.45)" }}>
            <i className="fa-solid fa-vault" style={{ fontSize:30, color:"#fff" }} />
          </div>
          <h1 style={{ fontSize:30, fontWeight:800, color:"#f1f5ff", letterSpacing:"-0.5px" }}>MonCoffre</h1>
          <p style={{ color:"#64748b", fontSize:13, marginTop:5 }}>
            <i className="fa-solid fa-shield-halved" style={{ marginRight:5, color:"#6366f1" }} />
            Tes fichiers, pour toujours
          </p>
        </div>

        <div style={{ display:"flex", background:"#111827", borderRadius:14, padding:4,
          marginBottom:22, border:"1px solid #1e293b" }}>
          {["login","register"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex:1, padding:"11px 0", border:"none", borderRadius:10, cursor:"pointer",
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:14,
              background: mode===m ? "linear-gradient(135deg,#6366f1,#818cf8)" : "transparent",
              color: mode===m ? "#fff" : "#64748b", transition:"all .2s"
            }}>
              <i className={m==="login" ? "fa-solid fa-right-to-bracket" : "fa-solid fa-user-plus"} style={{ marginRight:7 }} />
              {m==="login" ? "Connexion" : "S'inscrire"}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {mode==="register" && (
            <Field icon="fa-solid fa-id-card" value={displayName}
              onChange={e => setDisplayName(e.target.value)} placeholder="Ton prénom" />
          )}
          <Field icon="fa-solid fa-envelope" type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="Adresse email" />
          <Field icon="fa-solid fa-lock" type={showPw ? "text" : "password"}
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe"
            right={showPw ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}
            onRight={() => setShowPw(p => !p)}
            onKeyDown={e => e.key==="Enter" && submit()} />
          {mode==="register" && (
            <Field icon="fa-solid fa-lock-open" type="password"
              value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Confirmer le mot de passe"
              onKeyDown={e => e.key==="Enter" && submit()} />
          )}

          <button onClick={submit} disabled={busy} style={{
            background: busy ? "#1e293b" : "linear-gradient(135deg,#6366f1,#ec4899)",
            border:"none", borderRadius:14, padding:"15px 0", color:"#fff",
            fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:16,
            cursor: busy ? "not-allowed" : "pointer", marginTop:4,
            boxShadow: busy ? "none" : "0 8px 28px rgba(99,102,241,.38)",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            transition:"all .2s"
          }}>
            {busy
              ? <><i className="fa-solid fa-circle-notch" style={{ animation:"spin 1s linear infinite" }} /> Chargement...</>
              : mode==="login"
                ? <><i className="fa-solid fa-right-to-bracket" /> Se connecter</>
                : <><i className="fa-solid fa-user-plus" /> Créer mon compte</>
            }
          </button>
        </div>

        <p style={{ textAlign:"center", color:"#1e293b", fontSize:12, marginTop:24 }}>
          <i className="fa-brands fa-google" style={{ marginRight:5, color:"#334155" }} />
          Propulsé par Firebase · Données 100% privées
        </p>
      </div>
    </div>
  );
}

// ─── PREVIEW MODAL ────────────────────────────────────────────────────────────
function PreviewModal({ file, onClose }) {
  if (!file) return null;
  const { category, downloadURL, name, size, uploadedAt } = file;
  const c = CAT_COLORS[category] || CAT_COLORS.document;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(4,6,14,.92)",
      zIndex:1000, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end",
      fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:"100%", maxHeight:"92vh", background:"#0f1623",
        borderRadius:"22px 22px 0 0", padding:"16px 18px 44px",
        overflowY:"auto", boxShadow:"0 -24px 60px rgba(0,0,0,.7)",
        animation:"fadeIn .25s ease both"
      }}>
        <div style={{ width:36, height:4, background:"#1e293b", borderRadius:2, margin:"0 auto 18px" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <p style={{ color:"#f1f5ff", fontWeight:700, fontSize:15,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"78%" }}>
            <i className={c.fa} style={{ marginRight:8, color:c.icon }} />{name}
          </p>
          <button onClick={onClose} style={{ background:"#1e293b", border:"none", color:"#94a3b8",
            borderRadius:10, width:34, height:34, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <i className="fa-solid fa-xmark" style={{ fontSize:16 }} />
          </button>
        </div>

        {category==="image" && <img src={downloadURL} alt={name}
          style={{ width:"100%", borderRadius:14, maxHeight:340, objectFit:"contain" }} />}
        {category==="video" && <video controls src={downloadURL} style={{ width:"100%", borderRadius:14 }} />}
        {category==="audio" && (
          <div style={{ background:"#1a2235", borderRadius:14, padding:24, textAlign:"center" }}>
            <i className="fa-solid fa-waveform-lines" style={{ fontSize:44, color:"#6366f1", marginBottom:16, display:"block" }} />
            <audio controls src={downloadURL} style={{ width:"100%" }} />
          </div>
        )}
        {category==="document" && (
          <div style={{ background:"#1a2235", borderRadius:14, padding:32, textAlign:"center" }}>
            <i className="fa-solid fa-file-lines" style={{ fontSize:52, color:"#3b82f6", marginBottom:12, display:"block" }} />
            <p style={{ color:"#64748b", fontSize:14 }}>Aperçu non disponible pour ce type</p>
          </div>
        )}

        <a href={downloadURL} target="_blank" rel="noreferrer" download={name} style={{
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          background:"linear-gradient(135deg,#6366f1,#ec4899)",
          color:"#fff", padding:"15px 0", borderRadius:13, textDecoration:"none",
          fontWeight:800, fontSize:15, marginTop:18,
          boxShadow:"0 8px 24px rgba(99,102,241,.35)"
        }}>
          <i className="fa-solid fa-download" /> Télécharger
        </a>
        <p style={{ textAlign:"center", color:"#334155", fontSize:12, marginTop:12 }}>
          {formatSize(size)} · {formatDate(uploadedAt)}
        </p>
      </div>
    </div>
  );
}

// ─── FILE CARD ────────────────────────────────────────────────────────────────
function FileCard({ file, onDelete, onPreview }) {
  const c = CAT_COLORS[file.category] || CAT_COLORS.document;
  return (
    <div style={{ background:"#0f1623", border:"1px solid #1e293b", borderRadius:18,
      padding:"14px 12px", display:"flex", flexDirection:"column", gap:10,
      position:"relative", cursor:"pointer", animation:"fadeIn .3s ease both" }}
      onClick={() => onPreview(file)}>
      <button onClick={e => { e.stopPropagation(); onDelete(file); }} style={{
        position:"absolute", top:10, right:10,
        background:"rgba(239,68,68,.13)", border:"none", color:"#f87171",
        borderRadius:8, width:28, height:28, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center"
      }}>
        <i className="fa-solid fa-trash-can" style={{ fontSize:12 }} />
      </button>
      <div style={{ width:42, height:42, borderRadius:12, background:c.bg,
        display:"flex", alignItems:"center", justifyContent:"center",
        border:`1px solid ${c.icon}22` }}>
        <i className={c.fa} style={{ fontSize:19, color:c.icon }} />
      </div>
      <p style={{ color:"#e2e8f0", fontWeight:700, fontSize:13, lineHeight:1.4,
        overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2,
        WebkitBoxOrient:"vertical", paddingRight:16 }}>{file.name}</p>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontSize:11, color:"#475569", fontWeight:600 }}>{formatSize(file.size)}</span>
        <span style={{ fontSize:11, color:"#334155" }}>{formatDate(file.uploadedAt)}</span>
      </div>
    </div>
  );
}

// ─── UPLOAD PROGRESS ITEM ─────────────────────────────────────────────────────
function UploadItem({ name, progress, done }) {
  return (
    <div style={{ background:"#111827", border:"1px solid #1e293b", borderRadius:12,
      padding:"10px 14px", marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <p style={{ color:"#e2e8f0", fontSize:13, fontWeight:600,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"70%" }}>{name}</p>
        {done
          ? <i className="fa-solid fa-circle-check" style={{ color:"#10b981", fontSize:16 }} />
          : <span style={{ color:"#6366f1", fontSize:12, fontWeight:700 }}>{progress}%</span>
        }
      </div>
      {!done && <ProgressBar value={progress} />}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]           = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [files, setFiles]         = useState([]);
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch]       = useState("");
  const [preview, setPreview]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [uploads, setUploads]     = useState([]);   // [{name, progress, done}]
  const [toast, setToast]         = useState(null);
  const [dragOver, setDragOver]   = useState(false);
  const fileInputRef = useRef();
  const acceptRef    = useRef("*");

  const showToast = useCallback((msg, type="success") => setToast({ msg, type }), []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // Load files from Firestore
  const loadFiles = useCallback(async (uid) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "files"),
        where("uid", "==", uid),
        orderBy("uploadedAt", "desc")
      );
      const snap = await getDocs(q);
      setFiles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      showToast("Erreur chargement : " + e.message, "error");
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { if (user) loadFiles(user.uid); else setFiles([]); }, [user, loadFiles]);

  // Upload files
  const handleFiles = useCallback(async (rawFiles) => {
    if (!user) return;
    for (const f of Array.from(rawFiles)) {
      const uploadId = Date.now() + f.name;
      setUploads(p => [...p, { id: uploadId, name: f.name, progress: 0, done: false }]);

      const path = `users/${user.uid}/${Date.now()}_${f.name}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, f);

      await new Promise((resolve) => {
        task.on("state_changed",
          snap => {
            const pct = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
            setUploads(p => p.map(u => u.id===uploadId ? { ...u, progress: pct } : u));
          },
          err => {
            showToast(`Erreur upload "${f.name}" : ${err.message}`, "error");
            setUploads(p => p.filter(u => u.id !== uploadId));
            resolve();
          },
          async () => {
            const downloadURL = await getDownloadURL(task.snapshot.ref);
            const meta = {
              uid: user.uid,
              name: f.name,
              size: f.size,
              mimeType: f.type,
              category: getCategory(f.type, f.name),
              storagePath: path,
              downloadURL,
              uploadedAt: new Date(),
            };
            try {
              const docRef = await addDoc(collection(db, "files"), meta);
              setFiles(p => [{ id: docRef.id, ...meta }, ...p]);
              setUploads(u => u.map(x => x.id===uploadId ? { ...x, progress:100, done:true } : x));
              setTimeout(() => setUploads(p => p.filter(x => x.id !== uploadId)), 2000);
            } catch (e) {
              showToast("Erreur Firestore : " + e.message, "error");
            }
            resolve();
          }
        );
      });
    }
    showToast(`${rawFiles.length} fichier(s) uploadé(s) ✓`);
  }, [user, showToast]);

  // Delete
  const handleDelete = async (file) => {
    try {
      await deleteObject(ref(storage, file.storagePath));
      await deleteDoc(doc(db, "files", file.id));
      setFiles(p => p.filter(f => f.id !== file.id));
      showToast("Fichier supprimé");
    } catch (e) { showToast("Erreur suppression : " + e.message, "error"); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setFiles([]);
  };

  const filtered = files.filter(f => {
    const mc = activeCat==="all" || f.category===activeCat;
    const ms = !search || f.name.toLowerCase().includes(search.toLowerCase());
    return mc && ms;
  });

  const counts = { all: files.length };
  CATEGORIES.slice(1).forEach(c => { counts[c.id] = files.filter(f => f.category===c.id).length; });

  // Loading splash
  if (!authReady) return (
    <>
      <style>{G}</style>
      <div style={{ minHeight:"100vh", background:"#080b14", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", gap:16, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
        <div style={{ width:56, height:56, borderRadius:18,
          background:"linear-gradient(135deg,#6366f1,#ec4899)",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 12px 40px rgba(99,102,241,.4)" }}>
          <i className="fa-solid fa-vault" style={{ color:"#fff", fontSize:24 }} />
        </div>
        <i className="fa-solid fa-circle-notch" style={{ fontSize:24, color:"#6366f1",
          animation:"spin 1s linear infinite" }} />
      </div>
    </>
  );

  if (!user) return (
    <>
      <style>{G}</style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
      <AuthScreen onLogin={u => setUser(u)} showToast={showToast} />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
      <style>{G}</style>
      <input ref={fileInputRef} type="file" multiple accept={acceptRef.current}
        style={{ display:"none" }}
        onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value=""; }} />

      <div style={{ minHeight:"100vh", background:"#080b14",
        fontFamily:"'Plus Jakarta Sans',sans-serif", paddingBottom:110 }}>

        {/* HEADER */}
        <header style={{ background:"#0a0e1a", borderBottom:"1px solid #1e293b",
          padding:"14px 18px", position:"sticky", top:0, zIndex:50 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:12,
                background:"linear-gradient(135deg,#6366f1,#ec4899)",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 4px 16px rgba(99,102,241,.4)" }}>
                <i className="fa-solid fa-vault" style={{ color:"#fff", fontSize:17 }} />
              </div>
              <div>
                <p style={{ color:"#f1f5ff", fontWeight:800, fontSize:16, lineHeight:1 }}>MonCoffre</p>
                <p style={{ color:"#475569", fontSize:11, marginTop:3 }}>
                  <i className="fa-solid fa-circle-user" style={{ marginRight:4 }} />
                  {user.displayName || user.email}
                  <span style={{ marginLeft:8, color:"#334155" }}>· {files.length} fichier{files.length!==1?"s":""}</span>
                </p>
              </div>
            </div>
            <button onClick={handleLogout} style={{
              background:"#1e293b", border:"none", color:"#94a3b8",
              borderRadius:10, padding:"9px 14px", cursor:"pointer",
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:13,
              display:"flex", alignItems:"center", gap:6 }}>
              <i className="fa-solid fa-right-from-bracket" />
            </button>
          </div>
        </header>

        <div style={{ padding:"18px 16px" }}>
          {/* Search */}
          <div style={{ position:"relative", marginBottom:16 }}>
            <i className="fa-solid fa-magnifying-glass" style={{
              position:"absolute", left:15, top:"50%", transform:"translateY(-50%)", color:"#475569", fontSize:14 }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un fichier..."
              style={{ width:"100%", background:"#111827", border:"1px solid #1e293b",
                borderRadius:13, padding:"13px 16px 13px 44px", color:"#f1f5ff",
                fontSize:15, fontFamily:"'Plus Jakarta Sans',sans-serif", outline:"none" }} />
          </div>

          {/* Upload Buttons */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            {UPLOAD_BTNS.map(btn => (
              <button key={btn.type} onClick={() => {
                acceptRef.current = btn.accept;
                setTimeout(() => fileInputRef.current?.click(), 30);
              }} style={{
                background:"#111827", border:"1px solid #1e293b", borderRadius:14,
                padding:"13px 12px", display:"flex", alignItems:"center", gap:10,
                cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif",
                fontWeight:700, color:"#e2e8f0", fontSize:14 }}>
                <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                  background: btn.color + "18", border:`1px solid ${btn.color}30`,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <i className={btn.fa} style={{ color:btn.color, fontSize:16 }} />
                </div>
                <span>+ {btn.label}</span>
              </button>
            ))}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files); }}
            style={{ border:`2px dashed ${dragOver?"#6366f1":"#1e293b"}`, borderRadius:13,
              padding:"14px 0", textAlign:"center", marginBottom:16,
              color: dragOver?"#818cf8":"#334155", fontSize:13, transition:"all .2s",
              background: dragOver?"rgba(99,102,241,.06)":"transparent",
              fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize:20, marginRight:8 }} />
            Glisse des fichiers ici
          </div>

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <p style={{ color:"#64748b", fontSize:12, fontWeight:700, marginBottom:8 }}>
                <i className="fa-solid fa-arrow-up-from-bracket" style={{ marginRight:6 }} />
                ENVOI EN COURS
              </p>
              {uploads.map(u => <UploadItem key={u.id} name={u.name} progress={u.progress} done={u.done} />)}
            </div>
          )}

          {/* Category Tabs */}
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:6,
            marginBottom:18, scrollbarWidth:"none" }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{
                flexShrink:0, display:"flex", alignItems:"center", gap:6,
                padding:"8px 14px", borderRadius:30, border:"none", cursor:"pointer",
                fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:13,
                background: activeCat===cat.id ? "linear-gradient(135deg,#6366f1,#818cf8)" : "#111827",
                color: activeCat===cat.id ? "#fff" : "#64748b", transition:"all .2s" }}>
                <i className={cat.fa} style={{ fontSize:12 }} />
                {cat.label}
                <span style={{ background: activeCat===cat.id?"rgba(255,255,255,.22)":"#1e293b",
                  color: activeCat===cat.id?"#fff":"#475569",
                  borderRadius:20, padding:"1px 7px", fontSize:11, fontWeight:800 }}>
                  {counts[cat.id]}
                </span>
              </button>
            ))}
          </div>

          {/* Files Grid */}
          {loading ? (
            <div style={{ textAlign:"center", padding:56, color:"#334155" }}>
              <i className="fa-solid fa-circle-notch" style={{ fontSize:34, color:"#6366f1",
                display:"block", marginBottom:14, animation:"spin 1s linear infinite" }} />
              <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600 }}>Chargement...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"44px 20px",
              border:"1px dashed #1e293b", borderRadius:18 }}>
              <i className="fa-solid fa-folder-open" style={{ fontSize:46, color:"#1e293b", display:"block", marginBottom:14 }} />
              <p style={{ color:"#475569", fontWeight:700, fontSize:16, marginBottom:6,
                fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                {search ? "Aucun résultat" : "Coffre vide"}
              </p>
              <p style={{ color:"#334155", fontSize:13, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                {search ? "Essaie un autre terme" : "Ajoute tes premiers fichiers"}
              </p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {filtered.map(f => (
                <FileCard key={f.id} file={f} onDelete={handleDelete} onPreview={setPreview} />
              ))}
            </div>
          )}
        </div>
      </div>

      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
