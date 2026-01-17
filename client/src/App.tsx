import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { NotificationProvider } from './components/NotificationProvider'
import DashboardLayout from './components/DashboardLayout'
import AdminLayout from './components/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
// Landing Pages
import Landing from './pages/Landing'
import AICoaches from './pages/landing/AICoaches'
import Business from './pages/landing/Business'
import Blog from './pages/landing/Blog'
import BlogDetail from './pages/landing/BlogDetail'
import Pricing from './pages/landing/Pricing'
import Contact from './pages/landing/Contact'
// New Expanded Pages
import BigExitBlueprint from './pages/landing/BigExitBlueprint'
import CoreFramework from './pages/landing/CoreFramework'
import PlanFeatures from './pages/landing/PlanFeatures'
import BookReviews from './pages/landing/BookReviews'
import SuccessStories from './pages/landing/SuccessStories'
// Auth Pages
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import VerifyEmail from './pages/auth/VerifyEmail'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
// App Selector (former Homepage)
import Homepage from './pages/Homepage'
// Dashboard Pages
import Dashboard from './pages/Dashboard'
import Scorecard from './pages/Scorecard'
import Coaches from './pages/Coaches'
import Quizzes from './pages/Quizzes'
import QuizTake from './pages/QuizTake'
import QuizResults from './pages/QuizResults'
import Huddles from './pages/Huddles'
import AdminHuddles from './pages/admin/Huddles'
import Notes from './pages/Notes'
import Sessions from './pages/Sessions'
import ActionSteps from './pages/ActionSteps'
import Todos from './pages/Todos'
import KnowledgeCenter from './pages/KnowledgeCenter'
import DiscoveryQuestions from './pages/DiscoveryQuestions'
// Admin Pages
import Overview from './pages/admin/Overview'
import MorganOversight from './pages/admin/MorganOversight'
import Users from './pages/admin/Users'
import AdminCoaches from './pages/admin/Coaches'
import AdminQuizzes from './pages/admin/Quizzes'
import AdminSessions from './pages/admin/Sessions'
import Analytics from './pages/admin/Analytics'
import AdminPlans from './pages/admin/Plans'
import Plans from './pages/Plans'
import Emails from './pages/admin/Emails'
import System from './pages/admin/System'

function App() {
  return (
    <NotificationProvider>
      <Router>
        <Routes>
        {/* Landing Pages - Public Website */}
        <Route path="/" element={<Landing />} />
        <Route path="/ai-coaches" element={<AICoaches />} />
        <Route path="/business" element={<Business />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:id" element={<BlogDetail />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        
        {/* New Expanded Pages */}
        <Route path="/big-exit-blueprint" element={<BigExitBlueprint />} />
        <Route path="/core-framework" element={<CoreFramework />} />
        <Route path="/plan-features" element={<PlanFeatures />} />
        <Route path="/book-reviews" element={<BookReviews />} />
        <Route path="/success-stories" element={<SuccessStories />} />
        
        {/* Auth Pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* App Selector - Only for Admins (Daniel Rosario or ADMIN role) */}
        <Route path="/app" element={
          <ProtectedRoute requireAdmin={true}>
            <Homepage />
          </ProtectedRoute>
        } />
        
        {/* Dashboard routes - with layout */}
        <Route path="/dashboard" element={
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        } />
        <Route path="/scorecard" element={
          <DashboardLayout>
            <Scorecard />
          </DashboardLayout>
        } />
        <Route path="/coaches" element={
          <DashboardLayout>
            <Coaches />
          </DashboardLayout>
        } />
        <Route path="/sessions" element={
          <DashboardLayout>
            <Sessions />
          </DashboardLayout>
        } />
        <Route path="/quizzes" element={
          <DashboardLayout>
            <Quizzes />
          </DashboardLayout>
        } />
        <Route path="/quiz/take" element={
          <DashboardLayout>
            <QuizTake />
          </DashboardLayout>
        } />
        <Route path="/quiz/results" element={
          <DashboardLayout>
            <QuizResults />
          </DashboardLayout>
        } />
        <Route path="/huddles" element={
          <DashboardLayout>
            <Huddles />
          </DashboardLayout>
        } />
        <Route path="/notes" element={
          <DashboardLayout>
            <Notes />
          </DashboardLayout>
        } />
        <Route path="/action-steps" element={
          <DashboardLayout>
            <ActionSteps />
          </DashboardLayout>
        } />
        <Route path="/todos" element={
          <DashboardLayout>
            <Todos />
          </DashboardLayout>
        } />
        <Route path="/knowledge-center" element={
          <DashboardLayout>
            <KnowledgeCenter />
          </DashboardLayout>
        } />
        <Route path="/discovery-questions" element={
          <DashboardLayout>
            <DiscoveryQuestions />
          </DashboardLayout>
        } />
        <Route path="/plans" element={
          <DashboardLayout>
            <Plans />
          </DashboardLayout>
        } />
        
        {/* Admin Panel Routes - Protected */}
        <Route path="/admin" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <Overview />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/manage-morgan" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <MorganOversight />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/manage-users" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <Users />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/manage-coaches" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <AdminCoaches />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/manage-quizzes" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <AdminQuizzes />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/manage-sessions" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <AdminSessions />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/manage-analytics" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <Analytics />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/manage-emails" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <Emails />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/manage-plans" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <AdminPlans />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/manage-system" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <System />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/manage-huddles" element={
          <ProtectedRoute requireAdmin={true}>
            <AdminLayout>
              <AdminHuddles />
            </AdminLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
    </NotificationProvider>
  )
}

export default App
