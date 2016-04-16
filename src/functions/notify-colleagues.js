import moment from 'moment';
import _ from 'lodash';
import request from './request';

export default async (bot, uri, modifications, employee) => {
  const channel = _.get(bot.config, 'teamline.schedules.notification.channel') || 'office';
  const { get } = await request(bot, uri);

  const teams = await get(`employee/${employee.id}/teams/open`);
  const names = teams.map(team => `@${team.name.replace(/\s/, '').toLowerCase()}`);

  const modification = _.find(modifications, { type: 'sub' });
  if (!modification) return false;

  const start = moment(modification.start);
  const end = moment(modification.end);
  const duration = end.clone().hours(0).minutes(0).seconds(0)
                      .diff(start.clone().hours(0).minutes(0).seconds(0), 'days');

  const tomorrow = moment().add(1, 'day').hours(0).minutes(0).seconds(0);
  const today = moment().hours(0).minutes(0).seconds(0);

  if (duration <= 1 && start.isAfter(tomorrow)) return false;

  if (start.isBefore(tomorrow) && start.isSameOrAfter(today)) {
    out();
    return true;
  }

  if (duration > 1) {
    out();
    return true;
  }

  function out() {
    const text = bot.t('teamline.schedules.notification.out', {
      user: `@${employee.username}`,
      start: `*${start.format('DD MMMM, HH:mm')}*`,
      end: `*${end.format('DD MMMM, HH:mm')}*`,
      teams: names
    });

    bot.sendMessage(channel, text, {
      websocket: false,
      parse: 'full'
    });
  }
};
