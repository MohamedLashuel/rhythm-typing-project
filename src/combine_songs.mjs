import { readdirSync, readFileSync, writeFileSync } from "fs";
import { cwd } from "process";

// Since JS doesn't support listing out files of directories, we have to know in advance the locations of
// the song JSONs to load. This script is run during building and combines all song JSONs to a single file.
// This means you should rebuild after adding or editing songs
console.log("Running combine_songs script...")

const folders = readDirKeepPath("public/assets/songs");
const txt_ary = folders.map(f => getJSONText(f));
writeFileSync("public/assets/all_songs.json", JSON.stringify(txt_ary));

function getJSONText(folder) {
	const json_file = readDirKeepPath(folder).filter(s => /\.json$/.test(s))[0];
	if(json_file === undefined){
		console.warn(`JSON file couldn't be found in song folder ${folder}`);
		return "";
	}
	return readFileSync(json_file, { encoding: 'utf8' });
}

function readDirKeepPath(dir) {
	return readdirSync(dir).map(s => dir + '/' + s);
}