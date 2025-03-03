import { ApplicationCommandInputType, ApplicationCommandOptionType, Argument, CommandContext, sendBotMessage } from "@api/Commands";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { DraftType, UploadManager } from "@webpack/common";
import axios from "axios";


async function getServer(): Promise<string> {
    const response = await fetch("https://api.gofile.io/servers");
    const json = await response.json();
    const server = json.data.servers[0].name;
    return server;
}

async function UploadFile(source: File | string): Promise<string> {
    const server = await getServer();
    const uploadUrl = `https://${server}.gofile.io/uploadFile`;

    const formData = new FormData();
    formData.append("file", source);

    const response = await axios.post(uploadUrl, formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });

    if (response.data.status !== "ok") {
        throw new Error("Failed to upload file to Gofile");
    }

    return response.data.data.downloadPage;
}

const UploadStore = findByPropsLazy("getUploads");

function ResolveFile(options: Argument[], ctx: CommandContext): Promise<File | string | null> {
    for (const opt of options) {
        if (opt.type == ApplicationCommandOptionType.ATTACHMENT != null) {
            const upload = UploadStore.getUpload(ctx.channel.id, opt.name, DraftType.SlashCommand);
            if (upload) {
                return upload.item.file;
            }
        }
    }

    UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
    return Promise.resolve("");
}

export default definePlugin({
    name: "MaxFileSizeOverride",
    description: "Overrides the max upload size by using the GoFile API",
    authors: [{ name: "Tesa__", id: 526419011278471178n }],
    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "bigupload",
            description: "upload bigger files using GOFILE",
            options: [
                {
                    name: "file",
                    description: "File lol",
                    type: ApplicationCommandOptionType.ATTACHMENT
                }
            ],
            execute: async (opts, cmdCtx) => {
                try {
                    var url = await ResolveFile(opts, cmdCtx);
                    if (!url) throw "No File Selected!";

                } catch (err) {
                    sendBotMessage(cmdCtx.channel.id, {
                        content: String(err),
                    });
                    return;
                }

                const file = await UploadFile(url);

                setTimeout(() => {
                    sendBotMessage(cmdCtx.channel.id, {
                        content: `Ur file link <3: ${file}`,
                    });
                }, 10);
            }
        }
    ]
});