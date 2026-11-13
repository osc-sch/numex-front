import './App.css'
import { lazy, Suspense, useState } from 'react'
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
import TeacherCourseSectionsPage from './pages/TeacherCourseSectionsPage'
import TeacherSectionPostsPage from './pages/TeacherSectionPostsPage'
import TeacherSectionPage from './pages/TeacherSectionPage'
import StudentCoursesPage from './pages/StudentCoursesPage'
import StudentCourseDetailPage from './pages/StudentCourseDetailPage'
import StudentSectionPostPage from './pages/StudentSectionPostPage'
import TeacherSectionActivitiesPage from './pages/TeacherSectionActivitiesPage'
import TeacherActivityEditorPage from './pages/TeacherActivityEditorPage'
import StudentActivityPage from './pages/StudentActivityPage'
import TeacherActivityTrackingPage from './pages/TeacherActivityTrackingPage'
import { teacherSections } from './data/teacherWorkspace'
import { loadLatestTestResult, saveLatestTestResult } from './utils/testResults'

const TeacherMaterialEditorPage = lazy(() => import('./pages/TeacherMaterialEditorPage'))

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
      <Route path="/teacher/courses/:id" element={<TeacherCourseSectionsPage />} />
      <Route path="/teacher/courses/:courseId/sections/:sectionId/posts" element={<TeacherSectionPostsPage />} />
      <Route path="/teacher/courses/:courseId/sections/:sectionId/posts/new" element={<Suspense fallback={<p role="status">Cargando editor…</p>}><TeacherMaterialEditorPage /></Suspense>} />
      <Route path="/teacher/courses/:courseId/sections/:sectionId/posts/:postId/edit" element={<Suspense fallback={<p role="status">Cargando editor…</p>}><TeacherMaterialEditorPage /></Suspense>} />
      <Route path="/teacher/courses/:courseId/sections/:sectionId/activities" element={<TeacherSectionActivitiesPage />} />
      <Route path="/teacher/courses/:courseId/sections/:sectionId/activities/new" element={<TeacherActivityEditorPage />} />
      <Route path="/teacher/courses/:courseId/sections/:sectionId/activities/:activityId/edit" element={<TeacherActivityEditorPage />} />
      <Route path="/teacher/courses/:courseId/sections/:sectionId/activities/:activityId/tracking" element={<TeacherActivityTrackingPage />} />
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
      <Route path="/courses/:courseId/sections/:sectionId/activities/:activityId" element={<StudentActivityPage />} />
      <Route path="/courses/:courseId/sections/:sectionId/posts/:postId" element={<StudentSectionPostPage />} />
      <Route path="/courses/:id" element={<StudentCourseDetailPage />} />

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
