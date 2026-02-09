import { BaseDirectory, readDir, readTextFile } from '@tauri-apps/plugin-fs';

export interface FrameXPlugin {
    name: string;
    version?: string;
    description?: string;
    onLoad?: () => void;
    onUnload?: () => void;
}

export class PluginManager {
    private static instance: PluginManager;

    private constructor() { }

    public static getInstance(): PluginManager {
        if (!PluginManager.instance) {
            PluginManager.instance = new PluginManager();
        }
        return PluginManager.instance;
    }

    /**
     * Scans the 'plugins' directory in the AppData/Config folder and loads JS files.
     * WARNING: This uses eval() to execute code. Only use trusted plugins.
     */
    public async loadPlugins() {
        try {
            // Ensure plugins directory exists (or just try reading it)
            const entries = await readDir('plugins', { baseDir: BaseDirectory.AppConfig });

            console.log('Found plugin entries:', entries);

            for (const entry of entries) {
                if (entry.isFile && entry.name.endsWith('.js')) {
                    console.log(`Loading plugin: ${entry.name}`);
                    this.loadPluginFile(entry.name);
                }
            }
        } catch (e) {
            console.warn('Failed to load plugins (directory might not exist):', e);
        }
    }

    private async loadPluginFile(fileName: string) {
        try {
            const code = await readTextFile(`plugins/${fileName}`, { baseDir: BaseDirectory.AppConfig });

            // Wrap code in a closure to avoid polluting global scope (mostly)
            // and provide a way to register the plugin.
            // We expect the plugin to call `FrameX.registerPlugin({...})`

            const setupEnv = `
        const FrameX = {
            registerPlugin: (plugin) => {
                return plugin;
            },
            log: (msg) => console.log("[Plugin ${fileName}] " + msg)
        };
      `;

            // Dangerous! execution
            // In a real app, use a sandboxed iframe or a proper plugin engine (QuickJS).
            // For this feature request, we will simple eval it.

            // We'll append a return statement to get the registered plugin object if they return it,
            // or if they used the FrameX global we injected.

            const fullScript = `
        (function() {
            ${setupEnv}
            try {
                ${code}
            } catch(e) {
                console.error("Plugin execution error:", e);
            }
        })();
      `;

            // eslint-disable-next-line no-eval
            window.eval(fullScript);

        } catch (e) {
            console.error(`Error loading plugin file ${fileName}:`, e);
        }
    }
}
