
## Overview

ObsidianToNtfy is a plugin for Obsidian that scans your notes for task items and sends notifications. With tag-based subscription mapping, you can have task reminders sent to various channels based on the tags assigned to each task.

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

## Contributions

Contributions are welcome! Feel free to open an issue or a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](https://chat.openai.com/c/LICENSE.md) file for details.


## Support

If you find this plugin useful and want to support its development, you could buy me a coffee.

[![Buy Me A Coffee](https://influencermarketinghub.com/wp-content/uploads/2021/03/skiptheflip_buymeacoffee3_creativeworkdonations.png)](https://www.buymeacoffee.com/paddymac)