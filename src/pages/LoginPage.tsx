import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const LoginPage = () => {
    const { signInWithGoogle, user } = useAuth();
    const navigate = useNavigate();

    if (user) {
        return <Navigate to="/app" replace />;
    }

    const handleLogin = async () => {
        try {
            await signInWithGoogle();
            navigate('/app');
        } catch (error: any) {
            console.error("Login failed", error);
            // Translate common Firebase auth errors
            let msg = "Hubo un error al iniciar sesión.";
            if (error?.code === 'auth/popup-closed-by-user') {
                msg = "El inicio de sesión fue cancelado.";
            } else if (error?.code === 'auth/cancelled-popup-request') {
                msg = "Solo se permite una solicitud de inicio de sesión a la vez.";
            } else if (error?.code === 'auth/operation-not-allowed') {
                msg = "El proveedor de Google no está habilitado en la consola de Firebase. Por favor contacta al soporte (o habilítalo si eres admin).";
            } else if (error?.code === 'auth/unauthorized-domain') {
                msg = "El dominio actual no está autorizado en la consola de Firebase (Authentication > Settings > Authorized Domains).";
            } else if (error?.message) {
                msg = `Error: ${error.message}`;
            }
            alert(msg);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md p-8 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700 shadow-2xl"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Bienvenido</h1>
                    <p className="text-slate-400">Inicia sesión para continuar a TTasaciones Pro</p>
                </div>

                <button
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 hover:bg-slate-100 transition-colors font-medium py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transform transition-all active:scale-95"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Continuar con Google
                </button>
            </motion.div>
        </div>
    );
};

export default LoginPage;
