# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. **Database Setup**

   **First, set up your Supabase database:**
   
   a. Execute the base schema:
   ```sql
   -- Execute the content of base.txt in your Supabase SQL editor
   ```
   
   b. Set up user synchronization triggers:
   ```sql
   -- Execute the content of trigger.txt in your Supabase SQL editor
   -- Then execute sync_users.sql to sync existing users and set up policies
   ```
   
   c. Configure your environment variables:
   ```bash
   # Create a .env file with your Supabase credentials
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Start the app

   ```bash
   npx expo start
   ```

## Dashboard Features

The dashboard now connects to your Supabase database and displays real data:

- **Real-time data**: Fetches actual expenses, budgets, and group information
- **User authentication**: Uses Supabase Auth to identify users
- **Group filtering**: Filter data by specific groups or view all groups
- **Period filtering**: View data for different time periods (week, month, quarter, year)
- **Interactive charts**: Expenses by category, monthly trends, and budget comparisons
- **Recent activity**: Shows latest expenses and budget activities
- **PDF generation**: Generate reports with current data

### Database Tables Used:
- `users`: User profiles synchronized with Supabase Auth
- `groups`: User groups for organizing budgets
- `group_members`: User membership in groups
- `budgets`: Budget entries with status tracking
- `expenses`: Expense records linked to budgets and groups
- `contributions`: User contributions to group funds

### Key Components:
- `services/dashboardService.ts`: Handles all database queries for the dashboard
- `app/services/supa.service.ts`: Manages Supabase authentication
- `app/(tabs)/index.tsx`: Main dashboard component

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
