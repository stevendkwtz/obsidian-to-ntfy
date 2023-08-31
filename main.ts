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
}

const DEFAULT_SETTINGS: ObsidianToNtfySettings = {
  subscriptions: {}
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
    containerEl.createEl('h2', { text: 'ObsidianToNtfy Settings' });
  
    // Display existing tag subscriptions
    if (this.plugin.settings.tagSubscriptions) {
      for (const [tag, url] of Object.entries(this.plugin.settings.tagSubscriptions)) {
        this.createSettingInput(containerEl, tag, url);
      }
    }
  
    // Add a button to create a new subscription setting
    const addButton = containerEl.createEl('button', { text: 'Add new subscription' });
    addButton.addEventListener('click', () => {
      this.createSettingInput(containerEl, '', '');
    });
  }
  
  createSettingInput(containerEl: HTMLElement, initialTag: string, initialUrl: string) {
    const settingDiv = document.createElement('div'); // Create a wrapping div

    const newTagInput = document.createElement('input');
    newTagInput.type = 'text';
    newTagInput.placeholder = 'Enter tag';
    newTagInput.value = initialTag;

    const newUrlInput = document.createElement('input');
    newUrlInput.type = 'text';
    newUrlInput.placeholder = 'Enter subscription URL';
    newUrlInput.value = initialUrl;

    const removeButton = document.createElement('button');
    removeButton.innerText = 'Remove Tag Subscription';
    removeButton.addEventListener('click', async () => {
        const newTag = newTagInput.value;
        if (newTag && this.plugin.settings.tagSubscriptions && newTag in this.plugin.settings.tagSubscriptions) {
            delete this.plugin.settings.tagSubscriptions[newTag];
            await this.plugin.saveSettings();
            containerEl.removeChild(settingDiv); // Remove the wrapping div
        }
    });

    settingDiv.appendChild(newTagInput);
    settingDiv.appendChild(newUrlInput);
    settingDiv.appendChild(removeButton);

    containerEl.appendChild(settingDiv); // Append the wrapping div
}
  
  
}
