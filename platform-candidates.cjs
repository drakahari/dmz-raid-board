const {build}=require('./package.json');
module.exports={...build,directories:{...build.directories,output:'release/platform-candidates'},
 mac:{target:['zip','dmg'],identity:'-',notarize:false,hardenedRuntime:true,category:'public.app-category.utilities',artifactName:'DMZ-Raid-Board-${version}-mac-${arch}-candidate.${ext}'},
 linux:{target:['AppImage'],category:'Utility',executableName:'dmz-raid-board',artifactName:'DMZ-Raid-Board-${version}-linux-${arch}-candidate.${ext}'}
};
