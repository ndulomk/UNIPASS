'use client'
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast, Toaster } from 'react-hot-toast';
import { Input } from '@/components/ui/Input'; 

import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store';
import { loginStart, loginSuccess, loginFailure } from '@/store/authSlice';
import { loginAndFetchDetailsApi, LoginResponseDetails } from '@/lib/api'; 

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false); 
    const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({ email: false, password: false });
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();

    const validate = () => {
        const errors: { email?: string; password?: string } = {};
        if (!email) errors.email = 'Preencha o email';
        if (!password) errors.password = 'Preencha a senha';
        return errors;
    };

    const handleBlur = (field: 'email' | 'password') => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ email: true, password: true });
        const currentErrors = validate();
        if (currentErrors.email || currentErrors.password) {
            toast.error('Preencha todos os campos obrigatórios.');
            return;
        }
        
        setIsLoading(true);
        dispatch(loginStart());

        try {
            const loginDetails: LoginResponseDetails = await loginAndFetchDetailsApi(email, password);
            dispatch(loginSuccess(loginDetails));
            
            toast.success('Login realizado com sucesso!');

            setTimeout(() => {
                if (loginDetails.userData.role === 'student') {
                    router.push('/student/dashboard');
                } else if (loginDetails.userData.role === 'admin') {
                    router.push('/admin/dashboard');
                } else if (loginDetails.userData.role === 'staff') {
                    router.push('/staff/dashboard'); 
                }
                 else {
                    router.push('/'); 
                }
            }, 1200);

        } catch (err: any) {
            const displayMessage = err.message || 'Falha no login. Verifique suas credenciais ou tente novamente.';
            dispatch(loginFailure(displayMessage));
            toast.error(displayMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const errorsValidation = validate();

    return (
        <section className="min-h-screen flex">
            <div className="hidden md:flex w-1/2 bg-indigo-900 relative overflow-hidden">
                <Image
                    src="https://images.pexels.com/photos/6929214/pexels-photo-6929214.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                    alt="Paisagem tranquila"
                    layout="fill"
                    objectFit="cover"
                    quality={100}
                    className="opacity-90"
                    priority 
                />
                <div className="absolute inset-0 bg-indigo-900/30 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center p-8 max-w-md">
                        <h1 className="text-4xl font-bold text-white mb-4">Bem-vindo de volta</h1>
                        <p className="text-blue-100 text-lg">
                            Entre em sua conta e continue sua jornada conosco.
                        </p>
                    </div>
                </div>
            </div>

            <div className="w-full md:w-1/2 bg-gradient-to-br from-blue-950 to-indigo-900 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-12 relative">
                <Link
                    href="/"
                    className="absolute top-6 left-6 text-blue-200 hover:text-white text-sm transition flex items-center"
                >
                    ← Voltar para Home
                </Link>

                <div className="relative max-w-md w-full bg-white/5 dark:bg-gray-900/60 backdrop-blur-md border border-white/10 dark:border-gray-700/40 rounded-2xl p-8 shadow-xl">
                    <h2 className="text-3xl font-semibold text-center text-white dark:text-gray-100 mb-6">
                        Acesse sua Conta
                    </h2>
                    
                    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                        <Input
                            label="Email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onBlur={() => handleBlur('email')}
                            placeholder="seu@email.com"
                            error={touched.email && errorsValidation.email ? errorsValidation.email : undefined}
                            autoComplete="username"
                        />
                        <Input
                            label="Senha"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onBlur={() => handleBlur('password')}
                            placeholder="********"
                            error={touched.password && errorsValidation.password ? errorsValidation.password : undefined}
                            autoComplete="current-password"
                        />
                    
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center text-blue-100">
                                <input type="checkbox" className="form-checkbox rounded bg-white/10 border-white/10 mr-2 text-blue-500 focus:ring-blue-400" />
                                Lembrar-me
                            </label>
                            <a href="#" className="text-blue-200 hover:text-white">
                                Esqueceu a senha?
                            </a>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading} 
                            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-all duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>
                    <p className="text-sm text-center text-blue-100 mt-5">
                        Não tem uma conta?{' '}
                        <Link href="/register" className="underline hover:text-white transition-colors">
                            Cadastre-se
                        </Link>
                    </p>
                </div>
            </div>
            <Toaster position="top-right" />
        </section>
    );
}