import moment from 'moment';
import request from '../functions/request';
import _ from 'lodash';
import { wait } from '../functions/utils';

export default async (bot, uri) => {
  const { get } = request(bot, uri);
  moment.updateLocale('en', _.get(bot.config, 'moment') || {});
  moment.locale('en');
  moment.relativeTimeThreshold('h', 20);

  const job = bot.schedule.scheduleJob('0 0 9 * * * *', async () => {
    const enabled = _.get(bot.config, 'teamline.daily_goal_reminder', true);
    if (!enabled) return null;
    const channel = _.get(bot.config, 'teamline.daily_goal_reminder.channel', 'deadlines');

    try {
      const goals = await get('goals', {
        include: [{
          model: 'Employee',
          as: 'Owner',
        }],
      });

      const messages = [];

      await Promise.all(goals.filter(goal => goal.Owner && goal.deadline).sort((a, b) => {
        const ma = moment(a.deadline);
        const mb = moment(b.deadline);

        return ma.isSameOrBefore(mb) ? -1 : 1;
      }).map(async (goal, index) => {
        if (moment(goal.deadline).isSameOrBefore(moment())) return;

        const left = moment(goal.deadline).toNow(true);
        const diff = Math.abs(moment().diff(moment(goal.deadline), 'days'));

        const msg = bot.t('teamline.goals.reminder', {
          left,
          goal: goal.name,
        });

        let color;
        if (diff < 5) color = 'danger';
        else if (diff < 14) color = 'warning';
        else color = 'good';

        messages.push({
          text: msg,
          color,
          mrkdwn_in: ['text'],
        });
        const reminder = bot.t('teamline.goals.reminder_title');

        // avoid flooding
        await wait(index * 1000);
        await bot.sendMessage(goal.Owner.username, `${reminder} ${msg}`);
      }));

      await wait(1000);
      await bot.sendMessage(channel, moment().format('dddd, D MMMM, YYYY'), {
        attachments: messages,
        websocket: false,
      });

    } catch (e) {
      console.error(e);
      bot.log.error(e);
    }
  });

  return job;
};
