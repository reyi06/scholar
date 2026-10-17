import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { AdminLayout } from './components/layout/AdminLayout.tsx'
import { ProtectedRoute } from './components/layout/ProtectedRoute.tsx'
import { PublicLayout } from './components/layout/PublicLayout.tsx'
import { ScrollToTop } from './components/ScrollToTop.tsx'
import { StudentLayout } from './components/layout/StudentLayout.tsx'
import { LoadingState } from './components/ui'
import { useAuth } from './context/authContext.ts'

/**
 * Route-level code splitting.
 *
 * Each page is loaded on demand, so a visitor browsing the public directory
 * never downloads the student or administrator areas. The layouts and route
 * guards stay eagerly imported because they render on almost every navigation.
 */
const HomePage = lazy(async () => ({ default: (await import('./pages/public/HomePage.tsx')).HomePage }))
const ScholarshipDirectoryPage = lazy(async () => ({
  default: (await import('./pages/public/ScholarshipDirectoryPage.tsx')).ScholarshipDirectoryPage,
}))
const ScholarshipDetailPage = lazy(async () => ({
  default: (await import('./pages/public/ScholarshipDetailPage.tsx')).ScholarshipDetailPage,
}))
const LoginPage = lazy(async () => ({ default: (await import('./pages/public/LoginPage.tsx')).LoginPage }))
const RegisterPage = lazy(async () => ({ default: (await import('./pages/public/RegisterPage.tsx')).RegisterPage }))
const AboutPage = lazy(async () => ({ default: (await import('./pages/public/AboutPage.tsx')).AboutPage }))

const StudentDashboardPage = lazy(async () => ({
  default: (await import('./pages/student/StudentDashboardPage.tsx')).StudentDashboardPage,
}))
const StudentProfilePage = lazy(async () => ({
  default: (await import('./pages/student/StudentProfilePage.tsx')).StudentProfilePage,
}))
const SavedScholarshipsPage = lazy(async () => ({
  default: (await import('./pages/student/SavedScholarshipsPage.tsx')).SavedScholarshipsPage,
}))
const ApplicationsPage = lazy(async () => ({
  default: (await import('./pages/student/ApplicationsPage.tsx')).ApplicationsPage,
}))
const ApplicationDetailPage = lazy(async () => ({
  default: (await import('./pages/student/ApplicationDetailPage.tsx')).ApplicationDetailPage,
}))
const SemesterRegistrationPage = lazy(async () => ({
  default: (await import('./pages/student/SemesterRegistrationPage.tsx')).SemesterRegistrationPage,
}))
const MyGrantsPage = lazy(async () => ({ default: (await import('./pages/student/MyGrantsPage.tsx')).MyGrantsPage }))
const NotificationsPage = lazy(async () => ({
  default: (await import('./pages/student/NotificationsPage.tsx')).NotificationsPage,
}))

const AdminDashboardPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminDashboardPage.tsx')).AdminDashboardPage,
}))
const AdminScholarshipsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminScholarshipsPage.tsx')).AdminScholarshipsPage,
}))
const AdminScholarshipFormPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminScholarshipFormPage.tsx')).AdminScholarshipFormPage,
}))
const AdminStudentsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminStudentsPage.tsx')).AdminStudentsPage,
}))
const AdminApplicationsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminApplicationsPage.tsx')).AdminApplicationsPage,
}))
const AdminRegistrationsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminRegistrationsPage.tsx')).AdminRegistrationsPage,
}))
const AdminGrantsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminGrantsPage.tsx')).AdminGrantsPage,
}))
const AdminAnnouncementsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminAnnouncementsPage.tsx')).AdminAnnouncementsPage,
}))
const AdminReportsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminReportsPage.tsx')).AdminReportsPage,
}))
const AdminSettingsPage = lazy(async () => ({
  default: (await import('./pages/admin/AdminSettingsPage.tsx')).AdminSettingsPage,
}))

const NotFoundPage = lazy(async () => ({ default: (await import('./pages/NotFoundPage.tsx')).NotFoundPage }))

/**
 * Sends already-signed-in users away from the auth screens.
 * Kept here rather than in each page so login and register behave identically.
 */
function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      {/* A single boundary covers every lazily loaded page. */}
      <Suspense
        fallback={
          <div className="flex min-h-svh items-center justify-center bg-slate-50 dark:bg-slate-950">
            <LoadingState label="Loading page…" />
          </div>
        }
      >
        <Routes>
          {/* ---------------- Public ---------------- */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/scholarships" element={<ScholarshipDirectoryPage />} />
            <Route path="/scholarships/:id" element={<ScholarshipDetailPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route
              path="/login"
              element={
                <GuestOnlyRoute>
                  <LoginPage />
                </GuestOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestOnlyRoute>
                  <RegisterPage />
                </GuestOnlyRoute>
              }
            />
          </Route>

          {/* ---------------- Student ---------------- */}
          <Route element={<ProtectedRoute role="student" />}>
            <Route element={<StudentLayout />}>
              <Route path="/student/dashboard" element={<StudentDashboardPage />} />
              <Route path="/student/profile" element={<StudentProfilePage />} />
              <Route path="/student/saved" element={<SavedScholarshipsPage />} />
              <Route path="/student/applications" element={<ApplicationsPage />} />
              <Route path="/student/applications/:id" element={<ApplicationDetailPage />} />
              <Route path="/student/semester-registration" element={<SemesterRegistrationPage />} />
              <Route path="/student/grants" element={<MyGrantsPage />} />
              <Route path="/student/notifications" element={<NotificationsPage />} />
            </Route>
          </Route>

          {/* ---------------- Administrator ---------------- */}
          <Route element={<ProtectedRoute role="admin" />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/scholarships" element={<AdminScholarshipsPage />} />
              <Route path="/admin/scholarships/new" element={<AdminScholarshipFormPage />} />
              <Route path="/admin/scholarships/:id/edit" element={<AdminScholarshipFormPage />} />
              <Route path="/admin/students" element={<AdminStudentsPage />} />
              <Route path="/admin/applications" element={<AdminApplicationsPage />} />
              <Route path="/admin/registrations" element={<AdminRegistrationsPage />} />
              <Route path="/admin/grants" element={<AdminGrantsPage />} />
              <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>

          {/* Unknown URLs get a real page rather than a blank screen. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  )
}
