import { Interaction } from "discord.js";

/**
 * Bot command metadata type.
 * @typedef {Object} CommandMeta
 * @property {string} name - The name of the command. if type is 'Modal' or 'Button', this is the custom ID.
 * @property {string} description - A brief description of the command.
 * @property {
 *   name: string;
 *   description?: string;
 *   type:
 *     | "string"
 *     | "number"
 *     | "boolean"
 *     | "user"
 *     | "channel"
 *     | "role"
 *     | "mentionable"
 *     | "attachment";
 *   required?: boolean;
 *   choices?: (string | number)[];
 * } [options] - Optional command options.
 * @property {function} [autocomplete] - Optional function for command autocomplete.
 * @property {'text' | 'slash' | 'Button' | 'Modal'} type - The type of command.
 * @property {function} exec - The function to execute when the command is invoked.
 * @property {number} [cooldown] - Optional cooldown period in seconds.
 * @property {boolean} [adminOnly] - If true, only admins can use this command.
 * @property {boolean} [devOnly] - If true, only developers can use this command.
 * @example
 * const command: CommandMeta = {
 *   name: 'example',
 *   description: 'An example command',
 *   options: ,
 *   autocomplete: async (interaction) => {
 *     // Handle autocomplete logic here
 *   },
 *   type: 'slash',
 *   exec: async (interaction, ...args) => {
 *     // Command execution logic here
 *   },
 *   cooldown: 5, // 5 seconds cooldown
 *   adminOnly: false,
 *   devOnly: true
 * }
 */
export type CommandMeta = {
  name: string;
  description: string;
  options?: {
    name: string;
    description?: string;
    type:
      | "string"
      | "number"
      | "boolean"
      | "user"
      | "channel"
      | "role"
      | "mentionable"
      | "attachment";
    required?: boolean;
    choices?: (string | number)[];
  }[];
  autocomplete?(interaction: Interaction): Promise<void>;
  type: "slash" | "Button" | "Modal";
  exec(interaction: Interaction): Promise<void>;
  cooldown?: number;
  adminOnly?: boolean;
  devOnly?: boolean;
};
