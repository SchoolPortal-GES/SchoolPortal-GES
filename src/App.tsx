import { AuthProvider, useAuth } from '@/lib/auth-context';
import { AppearanceProvider } from '@/lib/appearance-context';
import { NavProvider, useNav } from '@/lib/nav-context';
import { LoginScreen } from '@/components/LoginScreen';
import { ProfileCompletion } from '@/components/ProfileCompletion';
import { LoadingScreen, Dashboard } from '@/components/Dashboard';
import { SchoolManagement } from '@/components/SchoolManagement';
import { StaffManagement } from '@/components/StaffManagement';
import { ForgotPinRequests } from '@/components/ForgotPinRequests';
import { ClassRegistration } from '@/components/ClassRegistration';
import { PupilsScreen } from '@/components/PupilsScreen';
import { SettingsScreen, WallpaperScreen, LanguageScreen, ProfileScreen } from '@/components/SettingsScreen';
import { AttendanceScreen } from '@/components/AttendanceScreen';
import { AcademicRecordsScreen } from '@/components/AcademicRecordsScreen';
import { LeviesScreen } from '@/components/LeviesScreen';
import { AnnouncementsScreen, MessagesScreen, AdvertisementsScreen, BroadcastsScreen } from '@/components/CommunicationsScreen';
import { ChatScreen } from '@/components/ChatScreen';
import { StatusScreen } from '@/components/StatusScreen';
import { EventCalendarScreen } from '@/components/EventCalendarScreen';
import { EmergencyAlertsScreen } from '@/components/EmergencyAlertsScreen';
import { LeaveApplicationsScreen } from '@/components/LeaveApplicationsScreen';
import { AppFeaturesScreen } from '@/components/AppFeaturesScreen';
import { StaffAppointmentScreen } from '@/components/StaffAppointmentScreen';
import { DocumentsScreen } from '@/components/DocumentsScreen';
import { AuditLogsScreen } from '@/components/AuditLogsScreen';
import { DataBackupScreen } from '@/components/DataBackupScreen';
import { MusicPlayer } from '@/components/MusicPlayer';
import { NotificationBanner } from '@/components/NotificationBanner';
import {
  DistrictDataSharingScreen,
  OfficeUserManagementScreen,
  EmisSharingScreen,
  DistrictMeetingsScreen,
  DistrictChatScreen,
  SchoolDataViewScreen,
  OfficeNoticesScreen,
} from '@/components/OfficeScreens';

function AppRoutes() {
  const { user, loading } = useAuth();
  const { route, back } = useNav();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  if (!user.profile_completed || user.must_change_pin) {
    return <ProfileCompletion />;
  }

  const goHome = () => back();

  let screen: React.ReactNode;
  switch (route) {
    case 'schools': screen = <SchoolManagement onBack={goHome} />; break;
    case 'staff': screen = <StaffManagement onBack={goHome} />; break;
    case 'forgot-pin': screen = <ForgotPinRequests onBack={goHome} />; break;
    case 'class-registration': screen = <ClassRegistration />; break;
    case 'pupils': screen = <PupilsScreen />; break;
    case 'attendance': screen = <AttendanceScreen />; break;
    case 'academic-records': screen = <AcademicRecordsScreen />; break;
    case 'levies': screen = <LeviesScreen />; break;
    case 'announcements': screen = <AnnouncementsScreen />; break;
    case 'messages': screen = <MessagesScreen />; break;
    case 'advertisements': screen = <AdvertisementsScreen />; break;
    case 'broadcasts': screen = <BroadcastsScreen />; break;
    case 'chat': screen = <ChatScreen />; break;
    case 'status': screen = <StatusScreen />; break;
    case 'event-calendar': screen = <EventCalendarScreen />; break;
    case 'emergency-alerts': screen = <EmergencyAlertsScreen />; break;
    case 'leave-applications': screen = <LeaveApplicationsScreen />; break;
    case 'app-features': screen = <AppFeaturesScreen />; break;
    case 'staff-appointment': screen = <StaffAppointmentScreen />; break;
    case 'documents': screen = <DocumentsScreen />; break;
    case 'audit-logs': screen = <AuditLogsScreen />; break;
    case 'data-backup': screen = <DataBackupScreen />; break;
    case 'settings': screen = <SettingsScreen />; break;
    case 'wallpaper': screen = <WallpaperScreen />; break;
    case 'language': screen = <LanguageScreen />; break;
    case 'profile': screen = <ProfileScreen />; break;
    case 'district-data-sharing': screen = <DistrictDataSharingScreen onBack={goHome} />; break;
    case 'export-approvals': screen = <DistrictDataSharingScreen onBack={goHome} />; break;
    case 'office-users': screen = <OfficeUserManagementScreen onBack={goHome} />; break;
    case 'emis-sharing': screen = <EmisSharingScreen onBack={goHome} />; break;
    case 'district-meetings': screen = <DistrictMeetingsScreen onBack={goHome} />; break;
    case 'district-chat': screen = <DistrictChatScreen onBack={goHome} />; break;
    case 'school-data-view': screen = <SchoolDataViewScreen onBack={goHome} />; break;
    case 'office-notices': screen = <OfficeNoticesScreen onBack={goHome} />; break;
    default: screen = <Dashboard />;
  }

  return (
    <>
      <NotificationBanner />
      <MusicPlayer />
      {screen}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppearanceProvider>
        <NavProvider>
          <AppRoutes />
        </NavProvider>
      </AppearanceProvider>
    </AuthProvider>
  );
}
