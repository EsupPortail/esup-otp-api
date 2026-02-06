import { transporter } from '../../transports/mailer.js';
import * as fileUtils from '../fileUtils.js';
import { getDisplayName } from '../../databases/user/userUtils.js';

import { Eta } from "eta";

const eta = new Eta({ views: fileUtils.relativeToAbsolutePath(import.meta.url, "./email_templates") });

export async function send_email({ recipients, subject, mainContent, user }) {
    const templatesParams = {
        user,
        mainContent,
        displayName: getDisplayName(user.userDb),
    }
    return transporter.sendMail({
        subject,
        text: await eta.renderAsync("userChangesNotifier/text.eta", templatesParams),
        html: await eta.renderAsync("userChangesNotifier/html.eta", templatesParams),
        bcc: recipients,
    });
}
