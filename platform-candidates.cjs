const {build}=require('./package.json');
const mac=process.platform==='darwin';
// macOS bundle notices belong in Contents/Resources, never the signed Contents root.
module.exports={...build,extraFiles:mac?[]:build.extraFiles,extraResources:mac?build.extraFiles:build.extraResources,directories:{...build.directories,output:'release/platform-candidates'},
 mac:{target:['zip','dmg'],identity:'-',notarize:false,hardenedRuntime:true,category:'public.app-category.utilities',artifactName:'DMZ-Raid-Board-${version}-mac-${arch}-candidate.${ext}'},
 linux:{target:['AppImage'],category:'Utility',executableName:'dmz-raid-board',artifactName:'DMZ-Raid-Board-${version}-linux-${arch}-candidate.${ext}'}
};
