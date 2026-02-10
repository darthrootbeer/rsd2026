/* Log JSON Error information to console */
function jsonError( jqXHR, textStatus, errorThrown ){
	/*console.log("[ERROR]( getJSON:"+jsonUrl+" )");*/
	console.log("[...err]");
	console.log(jqXHR);
	console.log(textStatus);
	console.log(errorThrown);
	console.log("[/ERROR]");
};

/*
 * loadJSON extends the ^this^ variable using the JSON
 * at the given URL. 
 *
 * Mappings link a key in ^this^ to a key in the JSON
 * *root* is a special key meaning to import the JSON
 * data at the root level of ^this^ 
 * 
 * callback will be called on ^this^
 */
function loadJSON( jsonUrl, mappings, callback ){
	var _this = this;

	$.getJSON(jsonUrl, function(data){
		if(mappings){
			$.each(mappings, function( k, v ){
				if( k == "*root*" ){
					$.extend( _this, data[v] );
				}else{
					if(! _this[k] ) _this[k] = {};
					$.extend( _this[k], data[v] );
				}
			});
		}else{
			$.extend( _this, data );
		}
		if(callback){
			callback.call( _this );
		}
	});
};

function url_to_kiosk_action( url ) {
	var nodes = url.split(/\//);
	var id = nodes[nodes.length-1];
	var guide = {
		"\\/Item\\/[\\d]+$"    : 'loadItem('+id+')',
		"\\/UPC\\/[\\d]+$"     : 'loadItem(&quot;'+id+'&quot;,true)',
		"\\/Home$"             : 'homepage.putHtml()',
		"\\/Contest\\/[\\d]+$" : 'contest.putDetails('+id+')',
		"\\/News\\/[\\d]+$"    : 'news.putDetails('+id+')',
		"\\/Event\\/[\\d]+$"   : 'events.putDetails('+id+')',
		"\\/Artist\\/[\\d]+$"  : 'current_artist.loadData('+id+')',
		"\\/Genre\\/[\\d]+$"   : 'genres.putHtml('+id+')'
	};

	for( var pattern in guide ){
		if( guide.hasOwnProperty(pattern) ){
			var rgx = new RegExp( pattern, "ig" );
			if( url.match(rgx) ){
				return guide[pattern];
			}
		}
	}
	return "";
}
