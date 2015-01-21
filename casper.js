var casper = require('casper').create();
var config = require(casper.cli.options.configPath || '../../sheut.config.js');

var sites = {};
var imageToCapture = '';
var lastViewport = config.viewports.length;
var lastSite = config.sites.length;
var lastSelector = config.sites[lastSite-1].selectors.length;
var lastImageToCapture = createImageName(config.sites[lastSite-1].name, config.sites[lastSite-1].selectors[lastSelector-1], config.viewports[lastViewport-1].name);
var urls = config.sites.map(function(site){
    sites[site.url] = site;
    return site.url;
});

var paths = {
    new: config.screenshots + '/new',
    different: config.screenshots + '/different',
    reference: config.screenshots + '/reference'
};

function slugize(name){
    return name.replace(' ', '-').replace('\\','').replace('/','');
}

function createImageName(site, selector, viewport){
    return slugize(site) + '_' + slugize(selector) + '_' + slugize(viewport) + '.png'
}

if (config.debug) {
    casper.options.verbose = true;
    casper.options.logLevel = "debug";
}

casper.start().each(urls, function(self, link) {
    var site = sites[link];

    self.each(config.viewports, function(self, viewport){

        this.then(function() {
            this.viewport(viewport.width, viewport.height);
        });

        this.thenOpen(link, function() {

            //may need to do this if site has JS changing the page on load.
            //    better to hook into browser events or something
            //    this.wait(5000);
            //});
            //this.then(function(){
            this.then(function(){
                if (site.hideSelectors) {
                    this.each(site.hideSelectors, function(self, selector){
                        this.evaluate(function(selector) {
                            var elsToHide = document.querySelectorAll(selector);
                            for (var el in elsToHide) {
                                elsToHide[el].setAttribute('style','visibility:hidden');
                            }
                        }, selector);
                    });
                }

                self.each(site.selectors, function(self, selector) {
                    self.waitForSelector(selector, (function() {
                        if (self.getElementInfo(selector).visible) {
                            imageToCapture = createImageName(site.name, selector, viewport.name);
                            console.log("Saved screenshot", imageToCapture);
                            self.captureSelector(paths.new + '/' + imageToCapture, selector);
                        } else {
                            console.warn(selector, 'on', site.name, 'isn\'t visible at', viewport.width, 'x', viewport.height, 'so no image has been captured');
                        }
                    }), (function() {
                        self.die('Timeout reached. Try setting the debug property in the Sheut config to true to determine the problem.');
                        self.exit();
                    }), 12000);
                });
            });
        });
    });
});

casper.on('capture.saved', function(err) {
    if (imageToCapture === lastImageToCapture){
        this.exit();
    }
});

casper.on('remote.message', function(msg) {
    this.echo('remote message caught: ' + msg);
});

casper.run();