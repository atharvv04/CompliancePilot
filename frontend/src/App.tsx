import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Datasets from './pages/Datasets'
import Controls from './pages/Controls'
import Surveillance from './pages/Surveillance'
import Reports from './pages/Reports'
import Exceptions from './pages/Exceptions'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Login />
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/datasets" element={<Datasets />} />
          <Route path="/controls" element={<Controls />} />
          <Route path="/surveillance" element={<Surveillance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/exceptions" element={<Exceptions />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </Box>
  )
}

export default App
