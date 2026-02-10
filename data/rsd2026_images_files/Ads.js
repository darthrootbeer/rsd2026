function Rotator(selector, ads, spec){
  this.sel       = selector;
  this.slots     = $(selector);
  this.num_slots = this.slots.length;

  if(!this.num_slots){
    //console.log("Skipping selector "+selector);
    return 0;
  }

  this.my_ads    = ads;
  this.ga_label  = spec.ga_label;
  this.index     = 0;
  this.timer     = setInterval(this.rotate.bind(this), 15000);
  this.rotate();
}

Rotator.prototype.track = function(ad){
  var id = ad.advertisement_id;
  if(typeof _gaq != 'undefined'){
    _gaq.push( ['_trackEvent', this.ga_label, 'Show', id],
               ['store._trackEvent', this.ga_label, 'Show', id])
  }
};

Rotator.prototype.build_html = function(ad){
  var html;
  var new_win = "";
  var re = /^http:/;
  if(re.test(ad.goto_url)) new_win = " target=_blank ";
  var target ="function(){window.location = '"+ad.goto_url+"'; return false;}";
  html = "<a "+new_win+"href='"+ad.goto_url+"' onclick='"+target+"'>";
  html += "<img alt='"+ad.title+"' src='"+ad.photo_url+"'/></a>";
  return html;
};

Rotator.prototype.rotate = function(){
  var r = this;
  r.slots.each(function(i){
    if(r.index >= r.my_ads.length) r.index = 0;
    //console.log("["+r.sel+"] Ad#"+r.index+"-->slot#"+i);
    var ad = r.my_ads[r.index];
    $(this).html(r.build_html(ad)).trigger('create');
    r.track(ad);
    r.index++;
  });
};

function Ads(){
  var ads = this;

  this.spec = {
    "towers" : {selectors : [".tower_div"], ga_label : "TowerAd"},
    "badges" : {selectors : [".badge_div"], ga_label : "BadgeAd"},
    "largebanners" : {selectors : [".largebanner_div"], ga_label : "LargeBannerAd"},
    "banners" : {
      // 3 selectors for 3 separate rotations of same banners:
      // Banners marked "above", "below", and unmarked
      selectors :
      [".banner_div.above", ".banner_div.below", ".banner_div:not(.above, .below)"],
      ga_label : "BannerAd"
    },
  };

  this.loadData = function(){
    ads.rotators = [];
    if (! this.refresh_timer) {
      this.refresh_timer = setInterval(this.loadData, 4 * 3600 * 1000);
    }

    var randfn = function(){ return Math.round(Math.random()) - 0.5; };

    $.ajax({
      url      : "/a.json",
      dataType : "json",
      success  : function(data, status, jqxhr){
        for(var ad_type in data){
          if(!data.hasOwnProperty(ad_type)) continue;
          if(!ads.spec.hasOwnProperty(ad_type)) continue;
          if(!data[ad_type].length) continue;
          var selectors = ads.spec[ad_type].selectors;
          for(var i in selectors){
            var selector = selectors[i];
            var r = new Rotator(selector,data[ad_type].sort(randfn),ads.spec[ad_type]);
            if(r) ads.rotators.push[r];
          }
        }
      }
    }).fail(function(jqxhr, status, error){
      console.log("ad load error - "+status+", "+error);
    });
  };
}
