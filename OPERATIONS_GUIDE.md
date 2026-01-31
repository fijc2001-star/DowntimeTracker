# Downtime Tracker - Operations Guide

## Overview

The Downtime Tracker is a manufacturing downtime tracking and analytics system designed for precision monitoring of production lines and equipment. It enables operators to log machine downtime events, categorize failure reasons, and provides real-time analytics on equipment utilization.

---

## Getting Started

### Logging In

1. Navigate to the application URL
2. Click "Sign in with Google" to authenticate
3. Upon first login, you'll be directed to the Administration page

---

## User Roles

The system has three user roles with different permission levels:

| Role | Description | Capabilities |
|------|-------------|--------------|
| **Owner** | Creator of a process | Full control including granting/revoking access, editing, and deleting |
| **Admin** | Assigned administrator | Can add/edit/delete nodes and downtime reasons, manage downtime events |
| **Operator** | Floor worker | Can start and stop downtime events, assign reasons |

---

## Main Features

### 1. Dashboard (Analytics)

The Dashboard provides visual analytics for downtime tracking:

- **Process/Node Selection**: Choose which process or node to analyze
- **Date Range Filtering**: Filter data by start and end dates using the calendar pickers
- **Downtime by Reason**: Pie chart showing distribution of downtime causes
- **Downtime by Node**: Pie chart showing which equipment has the most downtime (process view only)

**How to Use:**
1. Select a process or node from the dropdown
2. Optionally set date filters to narrow the time range
3. Click "Reset Filters" to clear all filters and show all historical data
4. View the pie charts to understand downtime patterns

---

### 2. Operations Page

The Operations page is where operators manage real-time downtime events:

#### Starting Downtime
1. Find the node/machine that is experiencing downtime
2. Click the "Start Downtime" button
3. The node status will change to "DOWN" (red indicator)

#### Stopping Downtime
1. Find the node currently in downtime
2. Click the "Stop Downtime" button
3. Select a reason for the downtime from the dropdown
4. Optionally add notes about the incident
5. Click "Complete" to log the event

---

### 3. Administration Page

The Administration page is for system configuration (requires Admin or Owner access):

#### Processes Section
- **Add Process**: Create a new production line or workflow
- **Edit Process**: Modify process name and description
- **Delete Process**: Permanently remove a process and all associated data

#### Nodes Section
- **Add Node**: Create equipment/machines within a process
- **Edit Node**: Modify node name
- **Delete Node**: Permanently remove a node and its downtime history

#### My Assignments Section
- View all processes and nodes you have access to
- See your role (Owner, Admin, or Operator) for each resource
- Leave assignments you no longer need (Admin role required)

#### Authorization Section (Owners Only)
- **Assign Access**: Grant users access to your processes or specific nodes
- **Select Assignment Type**: Choose between "Entire Process" or "Specific Node"
- **Select Role**: Choose Admin (full control) or Operator (start/stop downtime only)
- **Revoke Access**: Remove a user's access to a resource

#### Downtime Reasons Section
- **Add Reason**: Create new downtime categories (e.g., "Motor Failure", "Scheduled Maintenance")
- **Edit Reason**: Modify existing reason labels
- **Enable/Disable**: Toggle reasons active/inactive without deleting
- **Delete Reason**: Permanently remove a reason (events using it will show as "Unassigned")

---

## Common Workflows

### Setting Up a New Production Line

1. Go to **Administration > Processes**
2. Click **Add Process**, enter name and description
3. Go to **Nodes** section, click **Add Node**
4. Select the process and enter the machine name
5. Go to **Downtime Reasons**, select the process
6. Add relevant failure categories

### Granting Team Access

1. Go to **Administration > Authorization**
2. Click **Assign Access**
3. Select the user from the dropdown
4. Choose "Entire Process" or "Specific Node"
5. Select the process/node
6. Choose the role (Admin or Operator)
7. Click **Assign Access**

### Tracking a Downtime Event

1. Operator notices machine failure
2. Goes to **Operations** page
3. Finds the machine and clicks **Start Downtime**
4. When machine is repaired, clicks **Stop Downtime**
5. Selects the reason and adds notes
6. Clicks **Complete**

### Analyzing Downtime Patterns

1. Go to **Dashboard**
2. Select the process or node to analyze
3. Set date range if needed
4. Review pie charts:
   - **By Reason**: Which issues cause the most downtime?
   - **By Node**: Which machines have the most problems?

---

## Best Practices

1. **Create meaningful downtime reasons** - Use specific categories that help identify root causes
2. **Train operators** - Ensure all floor workers know how to start/stop downtime and select accurate reasons
3. **Review analytics regularly** - Use the dashboard to identify problem areas and prioritize maintenance
4. **Assign appropriate roles** - Give Admin access only to supervisors; Operators just need to log events
5. **Add notes to events** - Encourage operators to add details about what happened

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't see a process | Ask the process owner to grant you access |
| Can't add/edit nodes | You need Admin or Owner access to the process |
| Can't assign user access | Only process Owners can grant permissions |
| Downtime reason missing | Ask an Admin to add it in the Downtime Reasons section |
| Data not showing in charts | Check if date filters are restricting the view; click "Reset Filters" |

---

## Quick Reference

| Action | Location | Required Role |
|--------|----------|---------------|
| View analytics | Dashboard | Any assigned user |
| Start/Stop downtime | Operations | Operator, Admin, or Owner |
| Add/Edit processes | Administration > Processes | Owner only (for editing); Any user can create |
| Add/Edit nodes | Administration > Nodes | Admin or Owner |
| Add/Edit reasons | Administration > Downtime Reasons | Admin or Owner |
| Grant access | Administration > Authorization | Owner only |

---

## Support

For technical issues or feature requests, please contact your system administrator.
