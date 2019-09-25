module.exports = {
  USER_REG: /<input type="text" class="sl" name="(.*?)" value="" autofocus="autofocus" autocorrect="off" spellcheck="false" autocapitalize="off" placeholder="用户名或电子邮箱地址" \/>/,
  PASSWORD_REG: /<input type="password" class="sl" name="(.*?)" value="" autocorrect="off" spellcheck="false" autocapitalize="off" \/>/,
  ONCE_REG: /<input type="hidden" value="(.*?)" name="once" \/>/,
  GLOBAL_ONCE_REG: /\/signout\?once=(.*?)'; }" class="top">登出<\/a><\/td>/,
  // is user signed in
  LOGON_REG: /confirm\('确定要从 V2EX 登出？'\)/,
  CAPTCHA_REG: /<input type="text" class="sl" name="(.*?)" value="" autocorrect="off" spellcheck="false" autocapitalize="off" placeholder="请输入上图中的验证码" \/>/,
  GLOBAL_USER_INFO_REG: /<div class="box">[ \n]*<div class="cell">[ \n]*<table cellpadding="0" cellspacing="0" border="0" width="100%">[ \n]*<tr>[ \n]*<td width="48" valign="top"><a href="\/member\/(.*?)"><img .*?src="(.*?)" class="avatar" border="0" align="default" style="max-width: 48px; max-height: 48px;" \/><\/a><\/td>[\s\S]*?<span class="fade">(.*?)<\/span>[ \n]*<\/td>[ \n]*<\/tr>[ \n]*<\/table>[ \n]*<div class="sep10"><\/div>/,
  HOT_POSTS_REG: /<div class="box" id="TopicsHot">[\s\S]*?(<div class="cell .*?">([\s\S]*?)<\/table>[ \n]*?<\/div>[ \n]*)+[\s\S]*?<\/div>/g,
  NOTIFICATION_COUNT_REG: /<a href="\/notifications">([0-9]*?) 条未读提醒<\/a>/,
  HOT_POST_REG: /<div class="cell .*?">[ \n]*?<table [\s\S]*?<a href="\/member\/(.*?)"><img src="(.*?)"[\s\S]*?<a href="\/t\/(.*?)".*?>([\s\S]*?)<\/a>[\s\S]*?<\/table>[ \n]*?<\/div>/g,
  MAIN_POSTS_REG: /<div id="Main">[\s\S]*?<span class="chevron">→<\/span> <a href="\/recent">更多新主题<\/a>[ \n]*?<\/div>[ \n]*?<\/div>/g,
  MAIN_POST_REG: /<div class="cell item"[\s\S]*?>[ \n]*?<table [\s\S]*?<a href="\/member\/(.*?)"><img .*?src="(.*?)"[\s\S]*?<a href="\/t\/(.*?)".*?>([\s\S]*?)<\/a>[\s\S]*?<a class="node" href="\/go\/(.*?)">(.*?)<\/a>.*?<a href="\/member\/.*?">[\s\S]*?<\/table>[ \n]*?<\/div>/g,
  LAST_REPLY_REG: /<\/strong> &nbsp;•&nbsp; (.*?) &nbsp;•&nbsp; 最后回复来自 <strong><a href="\/member\/(.*?)">/,
  POST_UPCOUNT_REG: /<li class="fa fa-chevron-up"><\/li> &nbsp;([0-9]*?) &nbsp;&nbsp; <\/div>/,
  NODES_REG: /<div class="box">[\n ]*?(<div class="header"[^>]*>.*?)<\/div>[\n ]*?<div class="inner">([\s\S]*?)<\/div>/g,
  NODE_HEADER_REG: /<div class="header"[^>]*>.*?&nbsp; (.*)?<span class="fr"[^>]*?>(.*?) • <span class="small">([0-9]*?) /,
  NODE_REG: /<a href="\/go\/(.*?)" class="item_node">(.*?)<\/a>/g,
  NODES_PAGE_POST_REG: /<div class="cell [\s\S]*?>[ \n]*?<table [\s\S]*?<a href="\/member\/(.*?)"><img .*?src="(.*?)"[\s\S]*?<a href="\/t\/(.*?)".*?>([\s\S]*?)<\/a>[\s\S]*?<a href="\/member\/.*?">[\s\S]*?<\/table>[ \n]*?<\/div>/g,
  MEMBER_PAGE_POST_REG: /<div class="cell [\s\S]*?>[ \n]*?<table [\s\S]*?<a href="\/t\/(.*?)".*?>([\s\S]*?)<\/a>[\s\S]*?<a href="\/member\/(.*?)">[\s\S]*?<\/table>[ \n]*?<\/div>/g,
  NOTIFICATION_REG: /<div class="cell" id="n_(.*?)"><table[\s\S]*?<a href="\/member\/(.*?)"><img .*?src="(.*?)"[\s\S]*?<a href="\/t\/(.*?)">([^<]*?)<\/a>[\s\S]*?<span class="snow">(.*?)<\/span>[\s\S]*?<\/td><\/tr><\/table><\/div>/g,
  REPLIES_REG: /<div class="dock_area">[\s\S]*?<span class="fade">(.*?)<\/span>[ ]?<\/div><span class="gray">回复了 <a href="\/member\/(.*?)">[\s\S]*?<a href="\/go\/(.*?)">(.*?)<\/a>[\s\S]*?<a href="\/t\/(.*?)">(.*?)<\/a>[\s\S]*?<\/table>[\S\s]*?(<div class="reply_content">|<br \/>)(.*?)<\/div>/gm,
  USER_INFO_BOX_REG: /<div id="Main">[\n ]*?<div class="sep20"><\/div>[\n ]*?<div class="box">[\s\S]*?<\/div>[\n ]*?<div class="sep20"><\/div>/,
  USER_INFO_REG: /<table cellpadding="0" cellspacing="0" border="0" width="100%">[\s\S]*?<img .*?src="(.*?)" class="avatar"[\s\S]*?(<span><li class="fa fa-building"><\/li> &nbsp; <strong>.*?<\/strong>|[\s\S]*)[\s\S]*?<span class="gray">V2EX 第 ([0-9]*?) 号会员，加入于 (.*?)[<\n]([\s\S]*?)<\/span>/,
  POST_TITLE_REG: /<div class="header"><div class="fr"><a href="\/member\/(.*?)"><img .*?src="(.*?)" class="avatar" border="0" align="default" \/><\/a><\/div>[\n ]*?<a href="\/">V2EX<\/a> <span class="chevron">&nbsp;›&nbsp;<\/span> <a href="\/go\/(.*?)">(.*?)<\/a>[\n ]*?<div class="sep10"><\/div>[\n ]*?<h1>([\s\S]*?)<\/h1>/,
  POST_INFO_REG: /<a href="javascript:" onclick="upVoteTopic\((.*?)\);" class="vote"><li class="fa fa-chevron-up"><\/li>(.*?)<\/a> &nbsp;<a href="javascript:" onclick="downVoteTopic\((.*?)\);" class="vote"><li class="fa fa-chevron-down"><\/li><\/a><\/div> &nbsp; <small class="gray"><a href="\/member\/(.*?)">(.*?)<\/a> · (.*?) · (.*?) 次点击 &nbsp; <\/small>/,
  POST_CONTENT_REG: /<div class="topic_content">[\s\S]*?<div class="topic_buttons">/,
  POST_REPLY_REG: /<div id="r_([0-9]*?)"[\s\S]*?<td width="48" valign="top" align="center"><img .*?src="(.*?)" class="avatar"[\s\S]*?<span class="no">([0-9]*?)<\/span><\/div>[\n ]*?<div class="sep3"><\/div>[\n ]*?<strong><a href="\/member\/(.*?)"(.*?)<span class="ago">(.*?)<\/span>(.*?)[\n ]*?<div class="sep5"><\/div>[\n ]*?<div class="reply_content">([\s\S]*?)<\/div>[\n ]*?<\/td>/g,
  REPLY_ACTION_REG: /<textarea name="content" maxlength="10000" class="mll" id="reply_content"><\/textarea>[ \n]*<div class="sep10"><\/div>[ \n]*<div class="fr"><div class="sep5"><\/div><span class="gray">请尽量让自己的回复能够对别人有帮助<\/span><\/div>[ \n]*<input type="hidden" value="(.*?)" name="once" \/>/,
  PAGE_COUNT_REG: /class="page_input" autocomplete="off" value="\d*" min="1" max="(\d*)"/
};
