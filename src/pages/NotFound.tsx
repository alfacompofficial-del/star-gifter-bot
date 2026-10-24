import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        {/* noindex: 404 pages must not be indexed */}
        <meta name="robots" content="noindex, nofollow" />
        <title>404 — Страница не найдена | AlfaComp</title>
        <meta name="description" content="Страница не существует или была удалена. Вернитесь в каталог AlfaComp." />
        <link rel="canonical" href="https://alfacomp.uz/" />
      </Helmet>
      <div className="flex min-h-screen items-center justify-center bg-[#08090c] text-white">
        <div className="text-center px-4">
          <p className="text-[#1565C0] font-mono text-sm font-bold uppercase tracking-widest mb-3">404</p>
          <h1 className="text-3xl font-bold mb-3">Страница не найдена</h1>
          <p className="text-white/50 text-sm mb-6">
            Такой страницы не существует или она была удалена.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1565C0] text-white text-sm font-semibold rounded-lg hover:bg-[#1976D2] transition-colors"
          >
            Вернуться в каталог
          </Link>
        </div>
      </div>
    </>
  );
};

export default NotFound;
