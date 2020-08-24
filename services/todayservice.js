const models = require('../models');
const pageService = require('./pageservice');
const userRequests = require('../lib/userrequest');
const { getRandomInt } = require('../lib/utils');

let fetchPending = new Set();

const kFetchingInterval = 10;
const kFetchingIntervalJitter = 5;
const kTopCommentsSize = 3;

// try to update today list add put the result into the queue to be fetched later
exports.fetchTodayList = async (days = models.getDays()) => {
  const res = await pageService.fetchPage(userRequests.get('default'), 'https://www.v2ex.com/');
  const list = pageService.getTodayList(res);
  if (!list || list.length === 0) return console.warn('Could not fetch today list.', res);

  // add ids to fetchPending queue
  const ids = list.map(val => parseInt(val.t, 10));
  ids.forEach(id => fetchPending.add(id));

  models.updateTodayList(ids, days);
  return ids;
};

exports.getTodayList = async (days = models.getDays(), addToFetchPending = false) => {
  let list = await models.getTodayList();
  if (!list || list.length === 0) {
    list = await exports.fetchTodayList(days);
  }
  if (addToFetchPending) {
    list.forEach(item => fetchPending.add(item));
  }
  return list || [];
}

let fetchTimer = null;
// before fetching posts we should add posts to fetchPending
exports.fetchPendingTodayPosts = async () => {
  if (fetchTimer) return true;
  if (fetchPending && fetchPending.size === 0) return false;

  fetchTimer = setTimeout(async () => {
    const first = fetchPending.values().next().value;
    fetchPending.delete(first);

    let res;
    try {
      res = await pageService.fetchPage(userRequests.get('default'), pageService.PAGES.fPOST(first));
    } catch (ex) {
      return;
    } finally {
      fetchTimer = null;
      exports.fetchPendingTodayPosts();
    }

    const post = pageService.getTopicDetail(res, false);
    const savedPost = {
      title: post.title,
      nodeName: post.nodeName,
      node: post.node,
      avatar: post.avatar,
      author: post.author,
      time: post.time,
      clicks: post.clicks,
      upCount: post.upCount,
      t: post.t,
      likes: post.likes,
      appended: post.appended,
      content: post.content,
      replyCount: post.replyCount
    };

    // count top comments
    const likesMap = {};
    const topComments = [];
    let max = 0;
    post.replies.forEach((reply) => {
      const index = +reply.likes;
      if (index > max) max = index;
      if (!likesMap[index]) likesMap[index] = [];
      likesMap[index].push(reply);
    });
    while (topComments.length < kTopCommentsSize && max > 0) {
      if (max in likesMap) {
        topComments.push(...likesMap[max]);
      }
      max--;
    }
    savedPost.topComments = topComments;

    models.savePost({
      topic: first,
      author: post.author,
      title: post.title,
      contentJSON: JSON.stringify(savedPost),
      replyCount: post.replyCount
    });
  }, (getRandomInt(kFetchingInterval - kFetchingIntervalJitter / 2,
    kFetchingInterval + kFetchingIntervalJitter / 2)) * 1000);
};
