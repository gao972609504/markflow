/**
 * Emoji 短代码映射表
 * — 用于编辑器行内渲染 :shortcode: → emoji
 */
export const emojiMap: Record<string, string> = {
  // 表情
  'smile': '😊', 'grin': '😁', 'laugh': '😆', 'joy': '😂', 'rofl': '🤣',
  'wink': '😉', 'blush': '😊', 'heart_eyes': '😍', 'kissing_heart': '😘',
  'relaxed': '☺️', 'slight_smile': '🙂', 'neutral_face': '😐', 'expressionless': '😑',
  'unamused': '😒', 'sweat': '😓', 'pensive': '😔', 'confused': '😕',
  'confounded': '😖', 'kissing': '😗', 'kissing_smiling_eyes': '😙',
  'stuck_out_tongue': '😛', 'stuck_out_tongue_winking_eye': '😜',
  'stuck_out_tongue_closed_eyes': '😝', 'disappointed': '😞', 'worried': '😟',
  'angry': '😠', 'rage': '😡', 'cry': '😢', 'persevere': '😣',
  'triumph': '😤', 'disappointed_relieved': '😥', 'fearful': '😨',
  'weary': '😩', 'sleepy': '😪', 'tired_face': '😫', 'grimacing': '😬',
  'sob': '😭', 'open_mouth': '😮', 'hushed': '😯', 'cold_sweat': '😰',
  'scream': '😱', 'astonished': '😲', 'flushed': '😳', 'sleeping': '😴',
  'dizzy': '😵', 'no_mouth': '😶', 'mask': '😷', 'smile_cat': '😸',
  'joy_cat': '😹', 'smiley_cat': '😺', 'heartpulse_cat': '😻',
  'crying_cat_face': '😿', 'scream_cat': '🙀',
  // 手势 & 人物
  'thumbsup': '👍', 'thumbsdown': '👎', 'ok_hand': '👌', 'punch': '👊',
  'fist': '✊', 'v': '✌️', 'wave': '👋', 'hand': '✋', 'raised_hand': '✋',
  'pray': '🙏', 'clap': '👏', 'muscle': '💪', 'point_up': '☝️',
  'point_right': '👉', 'point_left': '👈', 'point_up_2': '👆', 'point_down': '👇',
  'eyes': '👀', 'brain': '🧠', 'tongue': '👅', 'lips': '👄',
  // 心形
  'heart': '❤️', 'orange_heart': '🧡', 'yellow_heart': '💛', 'green_heart': '💚',
  'blue_heart': '💙', 'purple_heart': '💜', 'black_heart': '🖤', 'white_heart': '🤍',
  'broken_heart': '💔', 'heart_exclamation': '❣️', 'two_hearts': '💕',
  'sparkling_heart': '💖', 'heartpulse': '💗', 'cupid': '💘',
  // 自然
  'sunny': '☀️', 'cloud': '☁️', 'rain': '🌧️', 'snow': '❄️', 'snowflake': '❄️',
  'thunderstorm': '⛈️', 'tornado': '🌪️', 'rainbow': '🌈', 'star': '⭐',
  'star2': '🌟', 'stars': '🌠', 'sparkles': '✨', 'fire': '🔥', 'droplet': '💧',
  'ocean': '🌊', 'bouquet': '💐', 'cherry_blossom': '🌸', 'rose': '🌹',
  'sunflower': '🌻', 'blossom': '🌼', 'tanabata_tree': '🎋', 'tree': '🌳',
  'evergreen_tree': '🌲', 'fallen_leaf': '🍂', 'maple_leaf': '🍁', 'seedling': '🌱',
  'cactus': '🌵', 'four_leaf_clover': '🍀',
  // 食物
  'coffee': '☕', 'tea': '🍵', 'beer': '🍺', 'beers': '🍻', 'wine': '🍷',
  'cocktail': '🍹', 'tropical_drink': '🍸', 'pizza': '🍕', 'hamburger': '🍔',
  'fries': '🍟', 'hotdog': '🌭', 'popcorn': '🍿', 'donut': '🍩', 'cookie': '🍪',
  'cake': '🎂', 'chocolate': '🍫', 'candy': '🍬', 'icecream': '🍦',
  'ice_cream': '🍨', 'apple': '🍎', 'green_apple': '🍏', 'banana': '🍌',
  'strawberry': '🍓', 'watermelon': '🍉', 'peach': '🍑', 'cherries': '🍒',
  // 物品
  'rocket': '🚀', 'airplane': '✈️', 'car': '🚗', 'bike': '🚲', 'bus': '🚌',
  'train': '🚆', 'ship': '🚢', 'boat': '⛵', 'helicopter': '🚁',
  'phone': '📱', 'computer': '💻', 'keyboard': '⌨️', 'mouse': '🖱️',
  'camera': '📷', 'video_camera': '📹', 'tv': '📺', 'radio': '📻',
  'battery': '🔋', 'bulb': '💡', 'flashlight': '🔦', 'book': '📖',
  'books': '📚', 'notebook': '📓', 'pencil': '✏️', 'pen': '🖊️',
  'paperclip': '📎', 'pushpin': '📌', 'scissors': '✂️', 'key': '🔑',
  'lock': '🔒', 'unlock': '🔓', 'bell': '🔔', 'gift': '🎁', 'balloon': '🎈',
  'trophy': '🏆', 'medal': '🏅', 'ribbon': '🎀', 'crystal_ball': '🔮',
  // 符号
  'check': '✅', 'x': '❌', 'question': '❓', 'exclamation': '❗',
  'warning': '⚠️', 'no_entry': '⛔', 'recycle': '♻️', 'white_check_mark': '✅',
  'negative_squared_cross_mark': '❎', 'information_source': 'ℹ️',
  'bangbang': '‼️', 'interrobang': '⁉️', '100': '💯', 'zzz': '💤',
  'new': '🆕', 'free': '🆓', 'ok': '🆗', 'sos': '🆘', 'up': '🆙',
  'cool': '🆒', 'end': '🔚', 'back': '🔙', 'on': '🔛', 'top': '🔝',
  'soon': '🔜', 'arrows_clockwise': '🔄', 'arrows_counterclockwise': '🔄',
  'repeat': '🔁', 'repeat_one': '🔂',
  'copyright': '©️', 'registered': '®️', 'tm': '™️',
  'hash': '#️⃣', 'asterisk': '*️⃣',
  'zero': '0️⃣', 'one': '1️⃣', 'two': '2️⃣', 'three': '3️⃣',
  'four': '4️⃣', 'five': '5️⃣', 'six': '6️⃣', 'seven': '7️⃣',
  'eight': '8️⃣', 'nine': '9️⃣', 'keycap_ten': '🔟',
  // 时间
  'clock': '🕐', 'hourglass': '⏳', 'watch': '⌚', 'alarm_clock': '⏰',
  'calendar': '📅', 'date': '📅',
  // 标志
  'zap': '⚡', 'boom': '💥', 'moneybag': '💰', 'dollar': '💵',
  'euro': '💶', 'pound': '💷', 'yen': '💴', 'diamond': '💎',
  'gem': '💎', 'crown': '👑', 'anchor': '⚓', 'magnet': '🧲',
  'gear': '⚙️', 'wrench': '🔧', 'hammer': '🔨', 'tools': '🛠️',
  'construction': '🚧', 'house': '🏠', 'office': '🏢', 'school': '🏫',
  'hospital': '🏥', 'bank': '🏦', 'castle': '🏰', 'church': '⛪',
  'tokyo_tower': '🗼', 'statue_of_liberty': '🗽',
  // 天文地理
  'earth_africa': '🌍', 'earth_americas': '🌎', 'earth_asia': '🌏',
  'globe_with_meridians': '🌐', 'moon': '🌙', 'sun': '☀️',
  'full_moon': '🌕', 'new_moon': '🌑', 'first_quarter_moon': '🌓',
}

export const emojiPattern = /:([a-z0-9_]+):/g
