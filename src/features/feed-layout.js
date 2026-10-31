const FEED_STYLE_ID = 'of-demo-feed-style';
function setFeedStyle(on) {
if (on) injectStyle(FEED_STYLE_ID, STYLES.feed);
else removeStyle(FEED_STYLE_ID);
}
