import { App, Plugin, PluginSettingTab, Setting, TextComponent, Notice, TFile } from 'obsidian';

interface Task {
  description: string;
  startDate?: string;
  scheduledDate?: string;
  dueDate?: string;
  recurrence?: 'day' | 'week' | 'month' | 'year' | string;
  status?: 'x' | '-' | '/' | ' ' | string ;
  tags?: string[];  // Added the tags,
  fileName?: string;
  lineNumber?: number;
}

interface ObsidianToNtfySettings {
  subscriptions: { [key: string]: string };
  tagSubscriptions?: { [tag: string]: string }; 
  defaultTime?: string; // Default time to send notifications
  enableInAppNotifications?: boolean; // Toggle for in-app notifications
  notificationTimeout: number; // in milliseconds
}

const DEFAULT_SETTINGS: ObsidianToNtfySettings = {
  subscriptions: {},
  defaultTime: '11:00', //TODO: need to use the delay property if we should trigger all the notifications on that day on startup, incase they dont have the app active, it means that the notifications will be already sent and will arrive at this time even if the app is offline. Also if the start up is after this time then need to send them immediately 
  enableInAppNotifications: true,
  notificationTimeout: 1800000 // Default to 30 minutes
};

const taskNotificationTimestamps: { [key: string]: Date } = {};

async function readGlobalFilterFromTasksPlugin() {
  return "#tasks"; // placeholder
}

// Example tasks
// - [ ] #task Order car parts, fog light cover and under cover
// - [ ] #personal Book mot 📅 2023-08-31 ⏫ 
// - [ ] #task Valet Car/wash🔼 
// - [ ] #task  Practice Charachorder 🔼 🔁 every week

async function collectTasksFromFiles(app: App): Promise<Task[]> {
  const allTasks: Task[] = [];

  for (const file of app.vault.getFiles()) {
    if (file.basename.includes("excalidraw")) continue;
    const content = await app.vault.read(file);

    const statusPart = "- \\[([ xX/-])\\]";
    const descriptionPart = "([^\\n📅⏫🔼🔁]*)";
    const remainderPart = "(?:\\s*([📅⏫🔼🔁][^\\n]*))?";
    const taskRegex = new RegExp(`${statusPart}\\s*${descriptionPart}${remainderPart}\\s*`, "gm");

    let match;
    let lineNumber = 1;  // Initialize line counter

    while ((match = taskRegex.exec(content)) !== null) {
      
      let remainder = match[3];
      let dueDateMatch = /📅 ([0-9]{4}-[0-9]{2}-[0-9]{2})/.exec(remainder);
      let priorityMatch = /(⏫|🔼)/.exec(remainder);
      let recurrenceMatch = /🔁 every (day|week|month|year)/.exec(remainder);

      // Count lines processed to this point.
      lineNumber += (content.substring(0, match.index).match(/\n/g) || []).length;

      // Capture and then remove the tags from the description.
      let taskTags = match[2].match(/#\w+/g) || [];
      let descriptionWithoutTags = match[2].replace(/#\w+/g, '').trim();

      let task = {
        status: (() => {
          switch (match[1]) {
            case 'x':
            case 'X':
              return 'done';
            case '-':
              return 'cancelled';
            case '/':
              return 'in progress';
            default:
              return 'todo';
          }
        })(),
        description: descriptionWithoutTags,
        dueDate: dueDateMatch ? dueDateMatch[1] : undefined,
        priority: priorityMatch ? priorityMatch[1] : undefined,
        recurrence: recurrenceMatch ? recurrenceMatch[1] : undefined,
        tags: taskTags,  // Assign the captured tags to the task object
        fileName: file.basename,
        lineNumber: lineNumber,
      };

      allTasks.push(task);
    }
  }

  return allTasks;
}


async function notifyTask(task: Task, subscription: string, app: App, pluginSettings: ObsidianToNtfySettings): Promise<void> {
  let clickUrl: string | null = null;
  if (task.fileName && task.lineNumber) {
    const currentVault = app.vault.getName();
    clickUrl = `obsidian://open?vault=${encodeURIComponent(currentVault)}&file=${encodeURIComponent(task.fileName)}&line=${task.lineNumber}`;
  }
  
  const ntfyPayload = {
    topic: subscription,
    message: `Task "${task.description}" is due today!`,
    title: "Task Due Today",
    tags: ["task", "reminder"],
    priority: 4,
    click: clickUrl,
    actions: [{ action: "view", label: "Open Task in Obsidian", url: clickUrl }]
  };

   // Perform the POST request to ntfy (you would replace this comment with your fetch call)
   fetch('https://ntfy.sh', { method: 'POST', body: JSON.stringify(ntfyPayload) })
   .then(response => response.json())
   .then(data => console.log(data))
   .catch((error) => console.error('Error:', error));
   
}


async function shouldNotify(task: Task, currentDate: Date, lastNotificationTime: Date, pluginSettings: ObsidianToNtfySettings): Promise<boolean> {
  const taskDate = new Date(task.dueDate || '1970-01-01');
  const currentTime = new Date();

  if ((currentTime.getTime() - lastNotificationTime.getTime()) < pluginSettings.notificationTimeout) {
    return false;
  }

  return taskDate.toDateString() === currentDate.toDateString() && task.status === "todo";
}

async function checkTasksAndNotify(app: App, ntfySubscriptions: { [key: string]: string }, pluginSettings: ObsidianToNtfySettings): Promise<void> {
  const tasks: Task[] = await collectTasksFromFiles(app);
  const currentDate = new Date();

  for (const task of tasks) {
    const taskId = `${task.description}-${task.dueDate}`;
    const lastNotificationTime = taskNotificationTimestamps[taskId] || new Date(0);

    if (await shouldNotify(task, currentDate, lastNotificationTime, pluginSettings)) {
      for (const [filter, subscription] of Object.entries(ntfySubscriptions)) {
        if (filter && task.tags?.includes(filter)) {
          taskNotificationTimestamps[taskId] = new Date();
          await notifyTask(task, subscription, app, pluginSettings);

          if (pluginSettings.enableInAppNotifications) {
            new Notice(`Task "${task.description}" is due today!`);
          }
        }
      }
    }
  }
}


export default class ObsidianToNtfy extends Plugin {
  settings: ObsidianToNtfySettings;

  async onload() {
    await this.loadSettings();
      this.addSettingTab(new ObsidianToNtfySettingTab(this.app, this));
    
      console.log("load setting");
      // Removed the debug line for tasksFilePath
      
      //const globalFilter = await readGlobalFilterFromTasksPlugin();
      const ntfySubscriptions = this.settings.tagSubscriptions || {};
  
      this.registerInterval(window.setInterval(() => {
      console.log("register interval");
      
      if (Object.keys(ntfySubscriptions).length > 0) { // Check if tagSubscriptions are set
        checkTasksAndNotify(this.app, ntfySubscriptions, this.settings);
      }
      
    }, 40000)); // Adjust this interval as you see fit
  }
  

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    console.log('settings', this.settings);
    
    if (!this.settings.tagSubscriptions) {
      this.settings.tagSubscriptions = {};
    }
  }
  
  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class ObsidianToNtfySettingTab extends PluginSettingTab {
  plugin: ObsidianToNtfy;

  constructor(app: App, plugin: ObsidianToNtfy) {
    super(app, plugin);
    this.plugin = plugin;
  }

  
  display(): void {
    let { containerEl } = this;

    // Setting up basic layout
    this.setupLayout(containerEl);

 
    //default notification time, as https://publish.obsidian.md/tasks/Introduction don't have times
    new Setting(containerEl)
    .setName('Default Notification Time')
    .setDesc('Set the default time for notifications in 24-hour format (HH:MM)')
    .addText(text => text
      .setPlaceholder('11:00')
      .setValue(this.plugin.settings.defaultTime || '11:00')
      .onChange(async (value) => {
        this.plugin.settings.defaultTime = value;
        await this.plugin.saveSettings();
      }));
  

    // For in-app notifications toggle
    new Setting(containerEl)
      .setName('Enable In-App Notifications')
      .setDesc('Toggle to enable/disable in-app notifications')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableInAppNotifications || false)
        .onChange(async (value) => {
          this.plugin.settings.enableInAppNotifications = value;
          await this.plugin.saveSettings();
        }));

    // Adding Notification Timeout Setting
    new Setting(containerEl)
      .setName('Notification Timeout')
      .setDesc('Set the minimum time between notifications for the same task (in minutes).')
      .addText(text => text
        .setPlaceholder('30')
        .setValue(this.plugin.settings.notificationTimeout ? (this.plugin.settings.notificationTimeout / 60000).toString() : '30')
        .onChange(async (value) => {
          this.plugin.settings.notificationTimeout = parseInt(value) * 60000; // Convert minutes to milliseconds
          await this.plugin.saveSettings();
        }));

    // Handle Tag Subscriptions
    this.handleTagSubscriptions(containerEl);

     // Add support section
    const supportSection = containerEl.createEl('div');
    supportSection.style.marginBottom = '30px'; // Adds bottom margin
    supportSection.innerHTML = `
      <hr>
      <h2>Support</h2>
      <p>If you find this plugin useful and want to support its development, you could buy me a coffee.</p>
      <a href="https://www.buymeacoffee.com/paddymac" target="_blank">
        <img src="https://influencermarketinghub.com/wp-content/uploads/2021/03/skiptheflip_buymeacoffee3_creativeworkdonations.png" alt="Buy Me A Coffee" style="width:200px;"> <!-- Sets the image width -->
      </a>
    `;
    
  }
  
  setupLayout(containerEl: HTMLElement) {

    containerEl.empty();
    containerEl.style.margin = '30px';  // Add padding to the container
    containerEl.style.padding = '10px';
    containerEl.createEl('h1', { text: 'ObsidianToNtfy Settings' });

    // Display main instructions
    containerEl.createEl('h3', { text: 'How Tag Subscriptions Work:' });

    containerEl.createEl('p', { text: 'This plugin allows you to map Obsidian tags to ntfy subscriptions. When a task with a specific tag reaches its due date, a notification will be sent out to all the listeners of the corresponding ntfy subscription.' });

    containerEl.createEl('p', { text: 'For example, if you have a task tagged with "#work", and you map "#work" to a specific ntfy subscription, then all listeners of that subscription will be notified when the task is due.' });

    // Add hyperlink to ntfy
    let ntfyLink = containerEl.createEl('a', { href: 'https://ntfy.sh/app', text: 'Learn more about ntfy subscriptions.' });
    ntfyLink.target = '_blank';

    // Add note about dependency on Obsidian Tasks plugin
    containerEl.createEl('h3', { text: 'Dependency:' });
    containerEl.createEl('p', { text: 'This plugin relies on tasks created using the Obsidian Tasks plugin.' });

    // Add hyperlink to Obsidian Tasks documentation
    let obsidianTasksLink = containerEl.createEl('a', { href: 'https://publish.obsidian.md/tasks/Introduction', text: 'Learn more about Obsidian Tasks.' });
    obsidianTasksLink.target = '_blank';
  }

  handleTagSubscriptions(containerEl: HTMLElement) {
    // Display existing tag subscriptions
    if (this.plugin.settings.tagSubscriptions) {
      for (const [tag, url] of Object.entries(this.plugin.settings.tagSubscriptions)) {
        this.createSettingInput(containerEl, tag, url);
      }
    }
  
    // Add a button to create a new subscription setting
    const addButton = containerEl.createEl('button', { text: 'Add new subscription' });
    addButton.addEventListener('click', () => {
      this.createSettingInput(containerEl, '', '', true);
    });
  }
  
  createSettingInput(containerEl: HTMLElement, initialTag: string, initialUrl: string, isNew: boolean = false) {
    let currentTag = initialTag;
    let currentSubscription = initialUrl;
  
    const addHashIfNeeded = (val: string) => val.startsWith('#') ? val : `#${val}`;
  
    const settingDiv = document.createElement('div');
    settingDiv.style.padding = '10px';
  
    const newTagInput = new TextComponent(settingDiv)
      .setPlaceholder('Enter tag')
      .setValue(currentTag)
      .onChange(async (val) => {
        await this.plugin.saveSettings();  // Save settings with latest changes
      });
  
    const newUrlInput = new TextComponent(settingDiv)
      .setPlaceholder('Enter subscription URL')
      .setValue(currentSubscription)
      .onChange(async (val) => {
        await this.plugin.saveSettings();  // Save settings with latest changes
      });
  
    if (isNew) {
      const addButton = settingDiv.createEl('button', { text: 'Add Subscription' });
      addButton.style.margin = '5px';
      addButton.addEventListener('click', async () => {
        if (newTagInput.getValue() && newUrlInput.getValue()) {
          currentTag = addHashIfNeeded(newTagInput.getValue());
          this.plugin.settings.tagSubscriptions![currentTag] = newUrlInput.getValue();
          await this.plugin.saveSettings();
          this.display();
          addButton.remove();
        }
      });
    }
  
    const removeButton = settingDiv.createEl('button', { text: isNew ? 'Cancel' : 'Remove Subscription' });
    removeButton.style.margin = '10px';
    removeButton.addEventListener('click', async () => {
      if (currentTag) {
        delete this.plugin.settings.tagSubscriptions![currentTag];
        await this.plugin.saveSettings();
        settingDiv.remove();
      }
    });
  
    containerEl.appendChild(settingDiv);
  }
  
  
  
  
}
