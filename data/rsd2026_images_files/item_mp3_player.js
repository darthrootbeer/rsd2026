/* An Item has many properties but most of them
 * will be loaded from JSON
 *
 * Its feature component is the PreviewPlayer,
 * a singleton that manages the jPlayer
 */
function Item() {
    // Full previews enabled for this item on Kiosk?
    //    ---> will be overwritten by 'Y' from JSON if true
    var kiosk_full_preview = 'N';

    // PreviewPlayer using singleton pattern as laid out by
    // addyosmani.com/resources/essentialjsdesignpatterns/book/#singletonpatternjavascript
    //     - item is reference to an item: ^this^ in this case
    var PreviewPlayer = (function( item ){

        // Reference to singleton for use in anonymouse functions
        // within this lexical scope
        var instance;
        var default_volume = 8;

        function init( my_item ) {
            // which track are we at?
            var index       = 0;

            // what div should jplayer make home?
            var selector    = "#jplayer";

            var vol_selector= "#jp-volume-bar";
            var nothing_has_played_yet = true;

            // time of last update
            var last_update = 0;

            // array of functions that make jplayer play
            // one for each track
            var playCallers = [];

            // Invoke jPlayer
            var buildPlayer = function(){
                var ancestor = ".buy_digital";


                $(selector).jPlayer({
                    swfPath             : "/templates/Store/default/TabletKiosk/jquery.mobile/Jplayer.swf",
                    preload             : "none",
                    cssSelectorAncestor : ancestor,
                    ready               : instance.j_ready,
                    timeupdate          : function(event){
                        last_update = event.timeStamp;
                    }
                });
                $("#jp_container_1").css("visibility","visible");
            };

            // returns a function that calls _play
            // on a *Broadtime-encoded* sample's URL
            // .... see: makeBestSampleSource
            var makeBTPlayFunc = function( sample ){
                var url = sample.url;
                return function(){
                    _play( url );
                }
            };

            // MNet tracks are trickier. They have time-limited URLs
            // So those URLs will be loaded-on demand before play
            var MNetTrack =  function( track ){
                this.mnet_id = track.mnet_id;
            };
            // This function will get the fresh medianet url
            // and send that to _play
            //
            // Since this will be used in play functions,
            // of which there are as many as there are tracks,
            // this has been put in the prototype
            MNetTrack.prototype.freshLinkAndPlay = function(){
                var mnet_temp = {};
                loadJSON.call(
                    mnet_temp,
                    "/sampletrack.json?id="+this.mnet_id,
                    null,
                    function(){
                        console.log("in anon mnet loader");
                        console.log(mnet_temp);
                        if(mnet_temp && mnet_temp.trackurl){
                            console.log("running _play "+mnet_temp.trackurl);
                            _play( mnet_temp.trackurl );
                        }
                    }
                );
            };

            // Makes a new MNetTrack, and returns a function
            // that will call MNetTrack's fresh link and play function
            // which is defined in the MNetTrack prototyp
            var makeMNetPlayFunc = function( track ){
                var t = new MNetTrack( track );
                return function(){
                    t.freshLinkAndPlay();
                }
            };

            // Returns the best sample player function for the given track
            // Best case: Full previews are enabled, and we find an
            // 'mp3-full' sample.
            // Otherwise, if we have an 'mp3-lofi', use that.
            // Lastly, fall back on the MNet as a source
            var makeBestSamplePlayer = function( track ){
                var best_sample = null;

                for(var idx = 0; idx < track.samples.length; idx +=1){
                    var sample = track.samples[idx];

                    // allow full length for SUN RSD 2016, 2017, 2018, & 2020
                    // and for Jim James golden record (password-protected page)
                    if( (my_item.item_id == '9007770786' || my_item.item_id == '9008643977'  || my_item.item_id == '9009891069' || my_item.item_id == '9009892030' || my_item.item_id == '9012824201')
                        && sample.type=='mp3-full' ){
                            best_sample = sample;
                            break; // full track enabled & present, so let's use it
                        }

                    if(sample.type=='mp3-lofi'){
                        best_sample = sample;
                    }

                }

                var playFunc = (best_sample)?
                        makeBTPlayFunc( best_sample )
                        :undefined;

                return {
                    play  : playFunc,
                    track : track
                };

            };

            // Set jPlayer's URL and call jPlayer's play function
            var _play = function( url ){
                $("#trackplayer").removeClass("no-tracks");
                $("#trackplayer").addClass("has-tracks");
                $(selector).jPlayer( "setMedia", { mp3 : url });
                $(selector).jPlayer("play");
            };
            // Load a sample player for each track into the
            // playCallers array
            var loadTracks = function( discs ){
                var _pc = playCallers = [];
                $.each( discs, function( discnum, disc ){
                    $.each( disc.tracks, function( tracknum, track ){
                        _pc.push(
                            makeBestSamplePlayer( track )
                        );
                    });
                });
            };

            // ***Public Interface to PreviewPlayer***
            return {
                loadList   : function( trackdata ){
                    this.index = 0;

                    if(trackdata && trackdata.discs
                       && trackdata.discs.length >= 1
                       && trackdata.discs[0].tracks.length >= 1
                       //&&(trackdata.discs[0].tracks[0].samples.length > 0 || trackdata.discs[0].tracks[0].mnet_id != null)
                      ){
                        loadTracks( trackdata.discs );
                        buildPlayer();
                    }
                },
                /* called when jPlayer is ready for action */
                j_ready   : function( ev ){
                    // We want to advance the player upon track completion
                    $(selector).bind($.jPlayer.event.ended, function(event){
                        instance.advance();
                    });

                    // Set default volume
                    $(vol_selector).on("change", function(){
                        instance.volume($(this).val()*0.09);
                    });

                    /*
                     $(vol_selector).val(default_volume).trigger("change");
                     */

                    // Let's play first track to get the ball rolling
                    //instance.play(0);
                },
                maybe_play : function(){
                    if( nothing_has_played_yet ){
                        instance.play();
                    }
                },
                /* unpause or play selected track */
                play      : function( selectedIndex ){
                    if(selectedIndex=="resume"){
                        $(selector).jPlayer("play");
                        return;
                    }
                    console.log("Selected: "+selectedIndex);
                    // Hey jQuery, unhighlight whichever track was playing
                    $(".track").removeClass('playing');

                    // We'll only modify the index if specifically given one
                    index = (selectedIndex != null)? selectedIndex : index;

                    // Highlight current track
                    $(".track").eq(index).addClass('playing');

                    if( nothing_has_played_yet ){
                        // insert silent track at index
                        // so that autoplay blocking isn't fooled
                        // by any intermediary GET requests required to play
                        // requested track
                        var play_silence = {
                            track : "silence",
                            play  : makeBTPlayFunc( {
                                url : "/templates/Store/default/point1sec.mp3"
                            })
                        };
                        playCallers.splice(index, 0, play_silence);
                    }
                    // Call the current track's sample player function
                    var caller = playCallers[index];
                    console.log("Playing "+index+" : "); console.log(caller.track);
                    caller.play();
                    nothing_has_played_yet = false;
                },
                /* unpause or play selected track */
                pause      : function(){
                    //$(selector).jPlayer("pause");
                    $(selector).jPlayer("pause");
                },
                /* next track or loop to beginning */
                advance  : function(){
                    // If we just played the silent track
                    // remove it from array, and keep index
                    // the same
                    if( playCallers[index].track == "silence" ){
                        playCallers.splice(index, 1);
                    }else{
                        index++;
                    }
                    index = (index >= playCallers.length)? 0 : index;

                    // Don't loop, only play if advance didn't wrap us 'round
                    //if( index > 0 ) instance.play();
                    instance.play();

                },
                /* As registered in j_ready above, effect the volume change */
                volume    : function( value ){
                    $(selector).jPlayer("option", "volume", value);
                },
                /* return true if it has been less than 10 seconds since
                 * we last actively played something */
                is_active : function(){
                    var now = new Date().getTime();
                    return ((now - last_update) < 10000);
                }

            };

        };

        // Instance handler
        return {
            getInstance : function() {
                if( !instance ){
                    // passing item reference along for PreviewPlayer's internal use
                    instance = init( item );
                }
                return instance;
            }
        };

    })(this);

    this.player      = {};
    this.trackdata   = {};


    // Create/retrieve PreviewPlayer instance
    this.playerBegin = function(){
        this.player = PreviewPlayer.getInstance();
    };


};

Item.prototype.load = loadJSON;

// We need data loaded from JSON before calling some functions
Item.prototype.loadData = function(itemid, is_upc) {
    var _this = this;
    if( this.kiosk_full_preview == 'Y' ){
        $("body").addClass("full-stream");
    }else{
        $("body").removeClass("full-stream");
    }
    // Then we get the track data...
    // ... after which we can create the player
    // ... and load it with our tracks
    var loadTracks = function( id_list ){
        var id_to_try = id_list.shift();
        _this.load(
            "/sampletracks.json?id=" + id_to_try,
            {
                /* importing remote data's [data] at [trackdata] locally */
                "trackdata"      : "data",
            },
            function(){
                if(_this.trackdata.discs[0] &&
                   _this.trackdata.discs[0].track_count &&
                   _this.trackdata.discs[0].track_count > 0){
                    _this.playerBegin();
                    _this.player.loadList( this.trackdata );
                }else{
                    if(id_list.length)loadTracks(id_list);
                }
            }
        );
    };
    loadTracks( [item_id] );
};
