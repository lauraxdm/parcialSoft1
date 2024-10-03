import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ isAuthenticated, setAuth, userInfo }) => {
  const navigate = useNavigate();

  const logout = (e) => {
    e.preventDefault();
    localStorage.removeItem("token");
    setAuth(false);
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between">
          <div className="flex space-x-7">
            <div>
              <Link to="/" className="flex items-center py-4 px-2">
                <span className="font-semibold text-white text-lg">Diagrama Clases UML</span>
              </Link>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-3">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="py-2 px-2 font-medium text-white hover:bg-blue-500 rounded transition duration-300">Iniciar sesión</Link>
                <Link to="/register" className="py-2 px-2 font-medium text-white bg-blue-500 hover:bg-blue-400 rounded transition duration-300">Registrarse</Link>
              </>
            ) : (
              <>
                <span className="text-white">
                  {userInfo ? `${userInfo.username} (${userInfo.email})` : 'Cargando...'}
                </span>
                <button onClick={logout} className="py-2 px-2 font-medium text-white hover:bg-blue-500 rounded transition duration-300">Cerrar sesión</button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;