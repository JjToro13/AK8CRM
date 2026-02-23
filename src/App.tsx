import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import CallHistory from './components/CallHistory'
import ClientManagement from './components/ClientManagement'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  const { user, loading, isAdmin } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Login />
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard isAdmin={isAdmin} />} />
          <Route path="/calls" element={<CallHistory isAdmin={isAdmin} />} />
          <Route path="/clients" element={<ClientManagement isAdmin={isAdmin} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App