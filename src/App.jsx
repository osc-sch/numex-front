import './App.css'
import { useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/authContext'
import { PublicAuth, RequireAuth } from './auth/AuthRoutes'
import ActivitySessionPage from './pages/ActivitySessionPage'
import ChallengesPage from './pages/ChallengesPage'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import LoginPage from './pages/LoginPage'
import ProgressPage from './pages/ProgressPage'
import RegisterPage from './pages/RegisterPage'
import TopicDetailPage from './pages/TopicDetailPage'
import TeacherHomePage from './pages/TeacherHomePage'
import TeacherCoursesPage from './pages/TeacherCoursesPage'
import TeacherSectionPage from './pages/TeacherSectionPage'
import StudentCoursesPage from './pages/StudentCoursesPage'
import { teacherSections } from './data/teacherWorkspace'
import { loadLatestTestResult, saveLatestTestResult } from './utils/testResults'

function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route element={<PublicAuth />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="/*" element={<AuthenticatedApp key={user?.id} />} />
      </Route>
    </Routes>
  )
}

function AuthenticatedApp() {
  const { user } = useAuth()
  return user.id_rol === 2 ? <TeacherApp /> : <StudentApp />
}

function TeacherApp() {
  return (
    <Routes>
      <Route path="/" element={<TeacherHomePage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
      {teacherSections.filter(section => section.id !== 'courses').map(section => (
        <Route key={section.id} path={section.path} element={<TeacherSectionPage section={section} />} />
      ))}
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/library/topic/:slug" element={<TopicDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function StudentApp() {
  const { user } = useAuth()
  const location = useLocation()
  const [latestTestResult, setLatestTestResult] = useState(() => loadLatestTestResult(user.id))
  const [resultSaved, setResultSaved] = useState(true)

  const handleTestComplete = (result) => {
    setLatestTestResult(result)
    setResultSaved(saveLatestTestResult(result, user.id))
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<HomePage latestTestResult={latestTestResult} resultSaved={resultSaved} />}
      />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="/courses" element={<StudentCoursesPage />} />

      <Route path="/challenges" element={<ChallengesPage />} />
      <Route path="/progress" element={<ProgressPage />} />
      <Route path="/library" element={<LibraryPage />} />

      <Route
        path="/library/topic/:slug"
        element={<TopicDetailPage />}
      />

      <Route
        path="/diagnostic"
        element={
          <ActivitySessionPage
            key={location.key}
            purpose="diagnostic"
            sessionData={location.state?.sessionData}
            onComplete={handleTestComplete}
          />
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
