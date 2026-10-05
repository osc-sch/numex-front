import { useRef, useState } from 'react'
import { Alert, Button, Offcanvas, Spinner } from 'react-bootstrap'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'

const navItems = [
  { label: 'Inicio', icon: 'bi-house-door-fill', path: '/' },
  { label: 'Desafíos', icon: 'bi-lightning-charge-fill', path: '/challenges' },
  { label: 'Mi progreso', icon: 'bi-bar-chart-fill', path: '/progress' },
  { label: 'Biblioteca', icon: 'bi-journal-text', path: '/library' },
]

const SIDEBAR_PREFERENCE_KEY = 'numex_sidebar_collapsed'

function DashboardLayout({ children, eyebrow }) {
  const { user, profile, logout } = useAuth()
  const displayName = profile?.nombre || user?.user_name || 'Estudiante'
  const loggingOut = useRef(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const currentDate = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  const formattedDate = currentDate.charAt(0).toUpperCase() + currentDate.slice(1)

  const toggleSidebar = () => {
    const collapsed = !isSidebarCollapsed
    setIsSidebarCollapsed(collapsed)
    try {
      localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(collapsed))
    } catch {
      // The menu can still be toggled when browser storage is unavailable.
    }
  }

  const handleNavigation = (path) => {
    setIsSidebarOpen(false)
    if (path) {
      navigate(path)
    }
  }

  const handleLogout = async () => {
    if (loggingOut.current) return
    loggingOut.current = true
    setIsLoggingOut(true)
    setLogoutError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(error.message || 'No se pudo cerrar la sesión. Intentá nuevamente.')
      setIsSidebarOpen(false)
    } finally {
      loggingOut.current = false
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="dashboard-page">
      <div className={`dashboard-shell${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <Offcanvas show={isSidebarOpen} onHide={() => setIsSidebarOpen(false)} responsive="lg"
          id="dashboard-navigation" className={`dashboard-sidebar${isSidebarCollapsed ? ' is-collapsed' : ''}`} aria-label="Menú principal">
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <span className="brand-mark" id="workspace-brand">NUMEX</span>
              <span>Matemáticas para secundario</span>
            </div>
            <button
              type="button"
              className="sidebar-collapse-toggle"
              aria-label={isSidebarCollapsed ? 'Expandir menú' : 'Compactar menú'}
              title={isSidebarCollapsed ? 'Expandir menú' : 'Compactar menú'}
              aria-expanded={!isSidebarCollapsed}
              aria-controls="dashboard-navigation"
              onClick={toggleSidebar}
            >
              <i className={`bi ${isSidebarCollapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="sidebar-close"
              aria-label="Cerrar menú"
              onClick={() => setIsSidebarOpen(false)}
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>

          <div className="profile-summary" title={isSidebarCollapsed ? displayName : undefined}>
            <div className="profile-avatar">
              {profile?.img_profile
                ? <img src={profile.img_profile} alt="" />
                : displayName.charAt(0).toUpperCase()}
            </div>
            <div className="profile-details">
              <p className="profile-label">Tu espacio</p>
              <h4>{displayName}</h4>
              {profile?.anio_cursada && <span className="profile-school-year">{profile.anio_cursada}° año de secundaria</span>}
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Navegación principal">
            <p className="sidebar-section-label">Mi aprendizaje</p>
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={(item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)) ? 'nav-item active' : 'nav-item'}
                aria-current={(item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)) ? 'page' : undefined}
                aria-label={item.label}
                title={isSidebarCollapsed ? item.label : undefined}
                onClick={() => handleNavigation(item.path)}
              >
                <span className="nav-icon" aria-hidden="true">
                  <i className={`bi ${item.icon}`} />
                </span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <Button variant="outline-secondary" className="w-100 logout-button" onClick={handleLogout}
              aria-label={isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
              title={isSidebarCollapsed ? 'Cerrar sesión' : undefined}
              disabled={isLoggingOut} aria-busy={isLoggingOut}>
              {isLoggingOut ? <Spinner size="sm" animation="border" aria-hidden="true" />
                : <i className="bi bi-box-arrow-right" aria-hidden="true" />}
              <span className="sidebar-button-label">{isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</span>
            </Button>
          </div>
        </Offcanvas>

        <main className="dashboard-main dashboard-main-empty">
          <header className="main-topbar">
            <div className="topbar-heading">
              <button
                type="button"
                className="menu-toggle"
                aria-label="Abrir menú"
                aria-expanded={isSidebarOpen}
                aria-controls="dashboard-navigation"
                onClick={() => setIsSidebarOpen(true)}
              >
                <i className="bi bi-list" aria-hidden="true" />
              </button>
              <div className="topbar-breadcrumb"><span>Mi aprendizaje</span><i className="bi bi-chevron-right" aria-hidden="true" /><p className="dashboard-eyebrow">{eyebrow}</p></div>
            </div>
            <div className="header-actions">
              <time className="current-date" dateTime={new Date().toISOString().split('T')[0]}>
                <i className="bi bi-calendar-event-fill" aria-hidden="true" />
                <span>{formattedDate}</span>
              </time>
              <button type="button" className="header-action" aria-label="Notificaciones">
                <i className="bi bi-bell-fill" aria-hidden="true" />
              </button>
            </div>
          </header>
          {logoutError && <Alert variant="danger" role="alert">{logoutError}</Alert>}
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
