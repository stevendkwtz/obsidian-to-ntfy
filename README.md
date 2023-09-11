
## Overview

ObsidianToNtfy is an Obsidian plugin designed to keep you on track with your tasks by sending timely notifications. The unique feature of this plugin is its ability to map tags to different notification channels, giving you customized reminders based on your task categories.

This functionality is especially beneficial for those who jot down tasks on their Obsidian desktop app and want to receive mobile reminders. By subscribing to specific topics, you'll receive mobile alerts when Obsidian is active. These alerts aren't just reminders; they also contain a link that takes you straight to the task within your Obsidian note. This direct access makes it convenient to mark the task as completed, ceasing further notifications. If you can't attend to the task immediately, don't worry—the plugin has a built-in timeout setting. By default, it will remind you every 30 minutes, but you can adjust this interval according to your preferences.

## Features

### Automatic Task Scanning

- Scans all Obsidian notes for tasks and automatically sets reminders.
- Looks for `- [ ] #task` syntax in notes to identify tasks.

### Dynamic Notifications

- Supports due date (`📅 YYYY-MM-DD`), priority (`⏫` or `🔼`), and recurrence (`🔁 every <time-period>`).
- Sends a notification to your desktop when tasks are due.

## Tag-Subscription Mapping

You can map each tag to a specific subscription. Whenever a task with that tag is found, it will be sent to the mapped subscription. You can add multiple subscriptions by clicking the "Add new subscription" button in the settings.

### Setting Customization

- Users can define their custom tag-subscription mappings.

## Installation

To install ObsidianToNtfy, follow these steps:

1. Go to Obsidian Settings.
2. Navigate to "Community plugins".
3. Search for "ObsidianToNtfy" and install.

## Configuration

### Adding a New Subscription

1. Open Obsidian settings.
2. Navigate to ObsidianToNtfy settings.
3. Click "Add new subscription."
4. Fill in the tag and subscription URL.

### Adjusting Polling Interval

By default, the plugin checks for tasks every 30 minutes. This can be adjusted in the code (not a UI feature as of now).

## Usage

Here's how to add a task in an Obsidian note:

markdownCopy code

`- [ ] #task Order car parts 📅 2023-08-31 ⏫` 

This will set a task with a due date and priority.

## FAQ

### Can I add multiple subscriptions?

Yes, you can add as many subscriptions as you want. Each will be triggered based on the tags you assign to your tasks.

### Do I need to have Obsidian running for the notifications to work?

Currently, yes, the Obsidian app must be running for the plugin to scan your notes and send notifications. However, we are in the process of implementing ntfy's delay property to allow notifications for tasks due within the next day. This would mean you won't necessarily have to keep Obsidian running at all times. And on startup we can pre-send notifications due that day, so if you have obsidian running on start-up it shouldnt be an issue.

### Can I customize the notification timeout setting?

Yes, the plugin provides a setting where you can adjust the notification timeout to suit your needs.

### Will this work on all Obsidian-supported platforms?

ObsidianToNtfy is primarily designed for the Obsidian desktop application. Mobile support may be limited. Although you can install ntfy on your mobile to recieve the notifications regardless if the plugin is running on mobile. The open task action on the notification will also work fine on mobile

### Is my data secure?

The plugin scans your notes locally on your computer, and only sends notification data to the channels you've subscribed to. Your data is never stored externally.

### Can I unsubscribe from a notification channel?

Yes, you can easily unsubscribe from any notification channel directly within the plugin's settings.

### What happens if I don’t tag a task?

If a task is not tagged, it won’t be mapped to a subscription, and therefore, no notification will be sent for that task.

### Is it possible to receive notifications for overdue tasks?

Currently, the plugin notifies you about tasks that are due today. However, we are considering adding functionality for overdue tasks in future updates.

### Can I use this plugin alongside other Obsidian plugins?

Yes, ObsidianToNtfy is designed to work seamlessly with other Obsidian plugins.


## In Development

### Upcoming Features

- Ability to add specific times for each task to notify. (Setting for default time currently).
- If Plugin enabled on phone and desktop, ensure no duplications of notifications.
- Adding the capability to use ntfy's delay property for tasks due within the next day, allowing for notifications even when Obsidian is not running.

## Contributions

Contributions are welcome! Feel free to open an issue or a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](https://chat.openai.com/c/LICENSE.md) file for details.


## Support

If you find this plugin useful and want to support its development, you could buy me a coffee.

[![Buy Me A Coffee](https://influencermarketinghub.com/wp-content/uploads/2021/03/skiptheflip_buymeacoffee3_creativeworkdonations.png)](https://www.buymeacoffee.com/paddymac)