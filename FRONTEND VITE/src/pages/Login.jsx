import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure, clearError } from '../store/authSlice';
import { loginAndFetchDetailsApi } from '../lib/api';
import { toast } from 'react-hot-toast';
import Input from '../components/ui/Input';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { error, isAuthenticated } = useSelector(state => state.auth);

  // Clear any existing errors when component mounts
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const validate = () => {
    const errors = {};
    
    if (!formData.email) {
      errors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }
    
    if (!formData.password) {
      errors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 4) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    return errors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (error) {
      dispatch(clearError());
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    
    const currentErrors = validate();
    if (Object.keys(currentErrors).length > 0) {
      const firstError = Object.values(currentErrors)[0];
      toast.error(firstError);
      return;
    }

    dispatch(loginStart());

    try {
      const loginDetails = await loginAndFetchDetailsApi(formData.email, formData.password);
      
      // Store remember me preference
      if (formData.rememberMe) {
        // Extend cookie expiration for remember me
        const extendedLoginDetails = {
          ...loginDetails,
          rememberMe: true
        };
        dispatch(loginSuccess(extendedLoginDetails));
      } else {
        dispatch(loginSuccess(loginDetails));
      }

      toast.success('Login realizado com sucesso!', {
        duration: 2000
      });

      // Redirect based on user role
      setTimeout(() => {
        const role = loginDetails.userData.role;
        switch (role) {
          case 'student':
            navigate('/student/dashboard');
            break;
          case 'admin':
            navigate('/admin/dashboard');
            break;
          case 'staff':
            navigate('/staff/dashboard');
            break;
          default:
            navigate('student/dashboard');
        }
      }, 1000);
      
    } catch (err) {
      console.log(err)
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao fazer login. Verifique suas credenciais.';
      dispatch(loginFailure(errorMessage));
      toast.error(errorMessage, {
        duration: 4000});
    }
  };

  const errorsValidation = validate();

  return (
    <section className="min-h-screen flex bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      
      {/* Left side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 to-indigo-900/90" />
        <img
          src="https://images.pexels.com/photos/6929214/pexels-photo-6929214.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="Paisagem tranquila"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-10 flex items-center justify-center p-12">
          <div className="text-center max-w-md space-y-6">
            <div className="w-20 h-20 mx-auto bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Bem-vindo de volta
            </h1>
            <p className="text-blue-100 text-lg leading-relaxed">
              Entre em sua conta e continue sua jornada de aprendizado conosco.
            </p>
            <div className="flex items-center justify-center space-x-4 text-blue-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm">Seguro</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-sm">Rápido</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                <span className="text-sm">Confiável</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 relative">
        <Link
          to="/"
          className="absolute top-6 left-6 text-blue-200 hover:text-white text-sm transition-colors duration-200 flex items-center space-x-2 group"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Voltar para Home</span>
        </Link>

        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Acesse sua Conta
              </h2>
              <p className="text-blue-200">
                Entre com suas credenciais para continuar
              </p>
            </div>

            {/* Form */}
            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => handleBlur('email')}
                placeholder="seu@email.com"
                error={touched.email && errorsValidation.email ? errorsValidation.email : undefined}
                autoComplete="email"
                className="bg-white/5 border-white/10 text-white placeholder-blue-300 focus:border-blue-400 focus:ring-blue-400"
              />

              <div className="relative">
                <Input
                  label="Senha"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => handleBlur('password')}
                  placeholder="Digite sua senha"
                  error={touched.password && errorsValidation.password ? errorsValidation.password : undefined}
                  autoComplete="current-password"
                  className="bg-white/5 border-white/10 text-white placeholder-blue-300 focus:border-blue-400 focus:ring-blue-400 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-blue-300 hover:text-white transition-colors"
                >
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center text-sm text-blue-200 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2 mr-2"
                  />
                  Lembrar-me
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-300 hover:text-white transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>

              <button
                type="submit"
                className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent `}
              >
                {(
                  'Entrar'
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-center text-sm text-blue-200">
                Não tem uma conta?{' '}
                <Link 
                  to="/register" 
                  className="text-blue-300 hover:text-white font-semibold transition-colors"
                >
                  Cadastre-se aqui
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}