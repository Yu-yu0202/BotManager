import { ChatInputCommandInteraction } from "discord.js";
import type { CommandMeta } from "../../types";
import { Command, Logger } from "../../core/index.js";

export class HotSwap implements CommandMeta {
  public name: string = "hotswap";
  public description: string =
    "コマンドのホットスワップ操作 [AdminOnly][DevOnly]";
  public type: "slash" = "slash";
  public options = [
    {
      name: "type",
      description: "アンロード/リロード",
      type: "string" as const,
      require: true,
      choices: ["unload", "reload"],
    },
    {
      name: "name",
      description: "対象名",
      type: "string" as const,
      require: true,
    },
  ];
  public adminOnly: boolean = true;
  public devOnly: boolean = true;

  public async exec(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    switch (interaction.options.getString("type", true)) {
      case "unload":
        if (
          Command.prototype.unload(interaction.options.getString("name", true))
        ) {
          await interaction.editReply("✅️ Unloaded successfully.");
        } else {
          await interaction.editReply("❌️ Unloaded failed.");
        }
        break;
      case "reload":
        if (
          Command.prototype.reload(interaction.options.getString("name", true))
        ) {
          await interaction.editReply("✅️ Reloaded successfully.");
        } else {
          await interaction.editReply("❌️ Reloaded failed.");
        }
        break;
    }
    Logger.log(`HotSwap command executed by ${interaction.user.tag}.`, "warn");
  }
}
