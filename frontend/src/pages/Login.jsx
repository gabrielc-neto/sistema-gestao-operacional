import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/logo.png";

export default function Login() {
  const [email, setEmail]   = useState("");
  const [senha, setSenha]   = useState("");
  const [erro, setErro]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [tentativas, setTentativas] = useState(0);
  const { login }   = useAuth();
  const navigate    = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    if (tentativas >= 5) {
      setErro("Muitas tentativas. Aguarde alguns minutos ou recupere sua senha.");
      return;
    }
    setErro("");
    setLoading(true);
    try {
      await login(email, senha);
      navigate("/dashboard");
    } catch (err) {
      const novas = tentativas + 1;
      setTentativas(novas);
      if (err.code === "auth/too-many-requests") {
        setErro("Acesso bloqueado temporariamente pelo Firebase. Tente mais tarde.");
      } else if (err.code === "auth/user-disabled") {
        setErro("Esta conta está desativada. Contate o administrador.");
      } else if (novas >= 5) {
        setErro("Muitas tentativas incorretas. Aguarde alguns minutos.");
      } else {
        setErro(`E-mail ou senha incorretos. (${novas}/5 tentativas)`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <img src={logo} alt="Pontual" style={styles.logo} />
        <p style={styles.sub}>Controle de Frota — Acesso Restrito</p>
        <form onSubmit={handleLogin}>
          <div style={styles.fg}>
            <label style={styles.label}>E-mail</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoFocus
            />
          </div>
          <div style={styles.fg}>
            <label style={styles.label}>Senha</label>
            <div style={styles.senhaWrap}>
              <input
                style={{...styles.input, paddingRight:42}}
                type={verSenha ? "text" : "password"}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button type="button" style={styles.eyeBtn} onClick={() => setVerSenha(v => !v)}>
                {verSenha ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          {erro && <p style={styles.erro}>{erro}</p>}
          <button style={{...styles.btn, opacity: loading ? 0.7 : 1}} type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrap:  { minHeight:"100vh", background:"#f0f4f8", display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  card:  { background:"#fff", borderRadius:14, padding:"40px 36px", width:"100%", maxWidth:380, boxShadow:"0 4px 24px rgba(0,0,0,.10)" },
  logo:  { width:200, display:"block", margin:"0 auto 8px" },
  sub:   { textAlign:"center", fontSize:".82rem", color:"#64748b", marginBottom:28 },
  fg:    { marginBottom:16 },
  label: { display:"block", fontSize:".72rem", fontWeight:600, color:"#64748b", textTransform:"uppercase", marginBottom:4 },
  input:     { width:"100%", padding:"10px 14px", borderRadius:7, border:"1px solid #e2e8f0", fontSize:".95rem", outline:"none", boxSizing:"border-box" },
  senhaWrap: { position:"relative" },
  eyeBtn:    { position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:"1rem", padding:0, lineHeight:1 },
  erro:  { color:"#dc2626", fontSize:".82rem", marginBottom:12 },
  btn:   { width:"100%", padding:"12px", background:"#f5c318", color:"#1a3a5c", border:"none", borderRadius:8, fontSize:"1rem", fontWeight:700, cursor:"pointer", marginTop:4 },
};
