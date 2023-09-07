import { App, Plugin, PluginSettingTab, Setting, TextComponent, Notice, TFile } from 'obsidian';

interface Task {
  description: string;
  startDate?: string;
  scheduledDate?: string;
  dueDate?: string;
  recurrence?: 'day' | 'week' | 'month' | 'year' | string;
  status?: 'x' | '-' | '/' | ' ' | string ;
  tags?: string[];  // Added the tags
}


interface ObsidianToNtfySettings {
  subscriptions: { [key: string]: string };
  tagSubscriptions?: { [tag: string]: string }; 
  defaultTime?: string; // Default time to send notifications
  enableInAppNotifications?: boolean; // Toggle for in-app notifications
}

const DEFAULT_SETTINGS: ObsidianToNtfySettings = {
  subscriptions: {},
  defaultTime: '11:00',
  enableInAppNotifications: true,
};

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
    while ((match = taskRegex.exec(content)) !== null) {
      
      let remainder = match[3];
      let dueDateMatch = /📅 ([0-9]{4}-[0-9]{2}-[0-9]{2})/.exec(remainder);
      let priorityMatch = /(⏫|🔼)/.exec(remainder);
      let recurrenceMatch = /🔁 every (day|week|month|year)/.exec(remainder);

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
        tags: taskTags  // Assign the captured tags to the task object
      };

      allTasks.push(task);
    }
  }

  return allTasks;
}


async function checkTasksAndNotify(app: App, ntfySubscriptions: { [key: string]: string }) {
  
  let tasks = await collectTasksFromFiles(app);
  let currentDate = new Date();

  console.log(tasks);
  console.log(ntfySubscriptions);
  

  tasks.forEach(task => {
    let taskDate = new Date(task.dueDate || '1970-01-01');

    if (taskDate.toDateString() === currentDate.toDateString()) {
      for (const [filter, subscription] of Object.entries(ntfySubscriptions)) {
        console.log(filter);
        console.log(task.tags);
        console.log(filter && task.tags?.includes(filter));
        
        if (filter && task.tags?.contains(filter)) {
          console.log(`Sending notification to ${subscription}`);
          new Notice(`Task "${task.description}" is due today!`);
        }
      }
    }
  });
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
        checkTasksAndNotify(this.app, ntfySubscriptions);
      }
      
    }, 15000)); // Adjust this interval as you see fit
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
    let newFilter = initialTag;
    let newSubscription = initialUrl;

    // Function to add a '#' to the filter if it doesn't start with one
    const addHashIfNeeded = (val: string) => {
      return val.startsWith('#') ? val : `#${val}`;
    };
  
    const settingDiv = document.createElement('div'); // Create a wrapping div
    settingDiv.style.padding = '10px';  // Add padding to the div
  
    const newTagInput = new TextComponent(settingDiv)
      .setPlaceholder('Enter tag')
      .setValue(newFilter)
      .onChange(async (val) => {
        newFilter = val;
        await this.plugin.saveSettings();
      });
  
    const newUrlInput = new TextComponent(settingDiv)
      .setPlaceholder('Enter subscription URL')
      .setValue(newSubscription)
      .onChange(async (val) => {
        newSubscription = val;
        await this.plugin.saveSettings();
      });
  
      if(isNew){
      const addButton = settingDiv.createEl('button', { text: 'Add Subscription' });
      addButton.style.margin = '5px';  // Add margin around the button
      addButton.addEventListener('click', async () => {
        if (newFilter && newSubscription) {
          newFilter = addHashIfNeeded(newFilter); // Ensure the tag starts with a '#'
          this.plugin.settings.tagSubscriptions![newFilter] = newSubscription;
          await this.plugin.saveSettings();
          this.display(); // Update the view
          addButton.remove();
        }
      });
    }


    const removeButton = settingDiv.createEl('button', { text: isNew ? 'Cancel' : 'Remove Subscription' });
    removeButton.style.margin = '10px';  // Add margin around the button
    removeButton.addEventListener('click', async () => {
      if (newFilter) {
        newFilter = addHashIfNeeded(newFilter); // Ensure the tag starts with a '#'
        delete this.plugin.settings.tagSubscriptions![newFilter];
        await this.plugin.saveSettings();
        settingDiv.remove();  // Remove the div containing the input fields and buttons for this subscription
      }
    });
  
    containerEl.appendChild(settingDiv); // Append the wrapping div
  }
  
  
  
}
