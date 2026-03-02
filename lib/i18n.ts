export type Language = 'en' | 'hi' | 'ml' | 'ta' | 'kn';

export const languageNames: Record<Language, string> = {
    en: 'English',
    hi: 'हिन्दी',
    ml: 'മലയാളം',
    ta: 'தமிழ்',
    kn: 'ಕನ್ನಡ',
};

const en = {
    save: 'Save', cancel: 'Cancel', close: 'Close', delete: 'Delete', done: 'Done',
    loading: 'Loading...', noData: 'No data', you: 'You', unknown: 'Unknown',
    signIn: 'Sign In', signingIn: 'Signing In...', createAccount: 'Create Account',
    creatingAccount: 'Creating Account...', email: 'Email', password: 'Password',
    confirmPassword: 'Confirm Password', fullName: 'Full Name',
    alreadyHaveAccount: 'Already have an account? Sign In',
    dontHaveAccount: "Don't have an account? Register",
    fillAllFields: 'Please fill in all fields', passwordsDontMatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters',
    accountCreated: 'Account created successfully!',
    welcomeBack: 'Welcome back to', manageTeam: 'Manage your team tasks and finances',
    taskx: 'TASKX', manageTasksFinances: 'Manage your tasks and finances', tasks: 'Tasks', money: 'Money',
    createNewTask: 'Create New Task', myTasks: 'My Tasks', tasksIAssigned: 'Tasks I Assigned',
    noTasksAssigned: 'No tasks assigned to you', noTasksBy: 'No tasks assigned by you',
    taskTitle: 'Task Title', enterTaskTitle: 'Enter task title', description: 'Description',
    enterDescription: 'Enter task description', assignTo: 'Assign To',
    noUsersFound: 'No other users found. Invite team members first.',
    accept: 'Accept', redirect: 'Redirect', markComplete: 'Mark Complete',
    redirectTask: 'Redirect Task', redirectTo: 'Redirect To',
    notesRequired: 'Notes (Required)', addRedirectNote: 'Add a note explaining the redirect...',
    completeTask: 'Complete Task', completionNotesReq: 'Completion Notes (Required)',
    addCompletionNote: 'Add notes about the completion...', completionNotes: 'Completion Notes:',
    from: 'From', assignedTo: 'Assigned to', pending: 'pending', accepted: 'accepted', completed: 'completed',
    addTransaction: 'Add Transaction', iOwe: 'I Owe', imOwed: "I'm Owed",
    netBalance: 'Net Balance', inYourFavor: '(in your favor)', youOwe: '(you owe)',
    noDebts: 'No debts recorded', noLendings: 'No lendings recorded', noPayments: 'No payment history',
    paymentHistory: 'Payment History', type: 'Type', amount: 'Amount (₹)',
    whatIsThisFor: 'What is this for?', person: 'Person',
    groupChat: 'TASKX Group', online: 'online', members: 'members',
    noMessages: 'No messages yet', startConversation: 'Start the conversation!',
    typeMessage: 'Type a message...', groupMembers: 'Group Members', offline: 'Offline',
    profile: 'Profile', accountSettings: 'Account Settings', personalInfo: 'Personal Information',
    privacySecurity: 'Privacy & Security', notifications: 'Notifications', preferences: 'Preferences',
    theme: 'Theme', about: 'About', signOut: 'Sign Out', emailAddress: 'Email Address',
    phoneNumber: 'Phone Number', location: 'Location', enterPhone: 'Enter phone number',
    enterLocation: 'Enter your location', bio: 'Bio', tellAboutYourself: 'Tell us about yourself',
    memberSince: 'Member since', saveChanges: 'Save Changes', unread: 'unread',
    markAllRead: 'Mark all read', clearAll: 'Clear all', noNotifications: 'No notifications',
    allCaughtUp: "You're all caught up!", notifEnabled: 'Notifications enabled',
    notifDisabled: 'Notifications disabled', appearance: 'Appearance', light: 'Light', dark: 'Dark',
    accentColor: 'Accent Color', owed: 'Owed', owing: 'Owing', aboutTaskx: 'About TASKX',
    whatIsTaskx: 'What is TASKX?',
    whatIsTaskxBody: 'TASKX is a closed-circuit task and money management app designed for small teams.',
    keyFeatures: 'Key Features',
    keyFeaturesBody: '• Task creation, assignment & completion tracking\n• Debt, lending & payment management\n• Photo proof uploads for payments\n• Dark & light mode support',
    team: 'Team', teamBody: 'Built with React Native, Expo, and lots of purple gradients.',
    settings: 'Settings', customizeExperience: 'Customize your experience', general: 'General',
    active: 'Active', enabled: 'Enabled', darkMode: 'Dark Mode', language: 'Language',
    dataPrivacy: 'Data & Privacy', privacySettings: 'Privacy Settings',
    manageConnections: 'Manage Connections', supportLegal: 'Support & Legal',
    helpCenter: 'Help Center', privacyPolicy: 'Privacy Policy', appInfo: 'App Info',
    dangerZone: 'Danger Zone', clearAllData: 'Clear All Data',
    profileVisibility: 'Profile Visibility', profileVisibilitySub: 'Allow others to view your profile',
    activityStatus: 'Activity Status', activityStatusSub: "Show when you're active",
    dataSharing: 'Data Sharing', dataSharingSub: 'Share usage data for improvements',
    saveSettings: 'Save Settings', collaborators: 'People you can collaborate with in TASKX',
    yourAccount: 'Your account', connected: 'Connected', viewProfile: 'View Profile',
    noConnections: 'No connections found', iUnderstand: 'I Understand',
    dataCollection: 'Data Collection',
    dataCollectionBody: 'TASKX is a demo application that stores all data locally.',
    localStorage: 'Local Storage',
    localStorageBody: "All tasks, transactions, and user data are stored in your device's local storage.",
    thirdParty: 'Third-Party Services',
    thirdPartyBody: 'This application does not integrate with any third-party analytics or tracking services.',
    yourResponsibility: 'Your Responsibility',
    yourResponsibilityBody: 'Do not enter sensitive personal information into this demo application.',
    updatePicture: 'Update Profile Picture',
    payNow: 'Pay Now',
    upiIdOptional: 'UPI ID (Optional)',
    notesOptional: 'Notes (Optional)',
    submitPayment: 'Submit Payment',
    reject: 'Reject',
};

export type TranslationKeys = typeof en;

export function getTranslations(lang: Language): TranslationKeys {
    if (lang === 'en') return en;
    try {
        if (lang === 'hi') return require('./lang/hi').default;
        if (lang === 'ml') return require('./lang/ml').default;
        if (lang === 'ta') return require('./lang/ta').default;
        if (lang === 'kn') return require('./lang/kn').default;
    } catch { }
    return en;
}

export default en;
