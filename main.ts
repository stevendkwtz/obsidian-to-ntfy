import { App, Plugin, PluginSettingTab, Setting, TextComponent, Notice, TFile } from 'obsidian';

interface Task {
  description: string;
  startDate?: string;
  scheduledDate?: string;
  dueDate?: string;
  recurrence?: 'day' | 'week' | 'month' | 'year' | string;
  status?: 'x' | '-' | '/' | ' ' | string ;
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
// - [ ] #task Book mot 📅 2023-08-31 ⏫ 
// - [ ] #task Valet Car/wash🔼 
// - [ ] #task  Practice Charachorder 🔼 🔁 every week

async function collectTasksFromFiles(app: App): Promise<Task[]> {
  const allTasks: Task[] = [];

  for (const file of app.vault.getFiles()) {
    if (file.basename.includes("excalidraw")) continue;
    const content = await app.vault.read(file);

    // Now making sure the regex matches line-start to line-end
    const statusPart = "- \\[([ xX/-])\\] #task";
    const descriptionPart = "([^\\n📅⏫🔼🔁]*)";
    const remainderPart = "(?:\\s*([📅⏫🔼🔁][^\\n]*))?";  // This will capture the remainder, or nothing if it's not there
    const taskRegex = new RegExp(`${statusPart}\\s*${descriptionPart}${remainderPart}\\s*`, "gm");  // Added 'm' for multi-line

    let match;
    while ((match = taskRegex.exec(content)) !== null) {
      // console.log('Match index:', match.index);
      // console.log('Match:', match);
      
      let remainder = match[3];
      let dueDateMatch = /📅 ([0-9]{4}-[0-9]{2}-[0-9]{2})/.exec(remainder);
      let priorityMatch = /(⏫|🔼)/.exec(remainder);
      let recurrenceMatch = /🔁 every (day|week|month|year)/.exec(remainder);

      let task = {
        status: (() => {
          switch (match[1]) {
            case 'x':
            case 'X':
              return 'done'; // done (no notifications)
            case '-':
              return 'cancelled'; // cancelled (no notifications)
            case '/':
              return 'in progress'; // in progress
            default:
              return 'todo'; // Todo
          }
        })(),
        description: match[2].trim(),
        dueDate: dueDateMatch ? dueDateMatch[1] : undefined,
        priority: priorityMatch ? priorityMatch[1] : undefined,
        recurrence: recurrenceMatch ? recurrenceMatch[1] : undefined
      };

      allTasks.push(task);
    }
  }

  return allTasks;
}


async function checkTasksAndNotify(app: App, ntfySubscriptions: { [key: string]: string }) {
  
  let tasks = await collectTasksFromFiles(app);
  console.log(tasks);
  
  let currentDate = new Date();

  console.log("checking tasks");
  
  tasks.forEach(task => {
    let taskDate = new Date(task.dueDate || '1970-01-01');

    for (const [subscription, filter] of Object.entries(ntfySubscriptions)) {
      if (filter && !task.description.includes(filter)) continue;

      if (taskDate.toDateString() === currentDate.toDateString()) {
        new Notice(`Task "${task.description}" is due today!`);
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
    const ntfySubscriptions = this.settings.subscriptions;
  
    this.registerInterval(window.setInterval(() => {
      console.log("register interval");
      
      // Removed the condition to check for tasksFilePath
      checkTasksAndNotify(this.app, ntfySubscriptions);
      
    }, 30000)); // Adjust this interval as you see fit
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
    let newTag = initialTag;
  
    const newSetting = new Setting(containerEl)
      .setName('Tag-Subscription Mapping')
      .addText((text: TextComponent) => text
        .setPlaceholder('Enter tag')
        .setValue(initialTag)
        .onChange(val => {
          newTag = val;
        }))
      .addText((text: TextComponent) => text
        .setPlaceholder('Enter subscription URL')
        .setValue(initialUrl)
        .onChange(async (val) => {
          if (newTag) {
            this.plugin.settings.tagSubscriptions![newTag] = val;
            await this.plugin.saveSettings();
          }
        }));
  }
  
  
}
