'use strict';

const _ = require('lodash');
const $ = require('jquery');
const DrawUtil = require('../utils/link');
const ArrowUtil = require('../utils/arrow');
require('./baseEdge.less');

class Edge {
  constructor(opts) {
    this.id = _.get(opts, 'id');
    this.targetNode = _.get(opts, 'targetNode');
    this._targetType = _.get(opts, '_targetType');
    this.targetEndpoint = _.get(opts, 'targetEndpoint');
    this.sourceNode = _.get(opts, 'sourceNode');
    this._sourceType = _.get(opts, '_sourceType');
    this.sourceEndpoint = _.get(opts, 'sourceEndpoint');
    this.type = _.get(opts, 'type');
    this.orientationLimit = _.get(opts, 'orientationLimit');
    this.shapeType = _.get(opts, 'shapeType');
    this.label = _.get(opts, 'label');
    this.arrow = _.get(opts, 'arrow');
    this.arrowPosition = _.get(opts, 'arrowPosition', 0.5);
    this.isExpandWidth = _.get(opts, 'isExpandWidth', false);
    this.dom = null;
    this.labelDom = null;
    this.arrowDom = null;
    this.eventHandlerDom = null;
    this.options = opts.options;
    this._isDeletingEdge = opts._isDeletingEdge;
    this._global = opts._global;
    this._on = opts._on;
    this._emit = opts._emit;
    // 性能优化
    this._labelWidth = 0;
    this._labelHeight = 0;

    // 贝塞尔曲线是反着画的，需要调整
    if (this.shapeType === 'Bezier') {
      this.arrowPosition = 1 - this.arrowPosition;
    }
  }
  _init() {
    if (this._isInited) {
      return;
    }
    this._isInited = true;
    this.dom = this.draw({
      id: this.id,
      dom: this.dom,
      options: this.options
    });
    this.labelDom = this.drawLabel(this.label);
    this.arrowDom = this.drawArrow(this.arrow);
  }
  draw(obj) {
    let path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('class', 'butterflies-link');
    
    if (this.isExpandWidth) {
      // 扩大线选中范围
      this.eventHandlerDom = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      this.eventHandlerDom.setAttribute('class', 'butterflies-link-event-handler');
    }
    return path;
  }
  _calcPath(sourcePoint, targetPoint) {
    if (!sourcePoint) {
      sourcePoint = {
        pos: [
          // this.type === 'endpoint' ? this.sourceEndpoint._posLeft + this.sourceEndpoint._width / 2 : this.sourceNode.left + this.sourceNode.dom.offsetWidth / 2,
          // this.type === 'endpoint' ? this.sourceEndpoint._posTop + this.sourceEndpoint._height / 2 : this.sourceNode.top + this.sourceNode.dom.offsetHeight / 2
          this.type === 'endpoint' ? this.sourceEndpoint._posLeft + this.sourceEndpoint._width / 2 : this.sourceNode.left + $(this.sourceNode.dom).width() / 2,
          this.type === 'endpoint' ? this.sourceEndpoint._posTop + this.sourceEndpoint._height / 2 : this.sourceNode.top + $(this.sourceNode.dom).height() / 2
        ],
        orientation: (this.type === 'endpoint' && this.sourceEndpoint.orientation) ? this.sourceEndpoint.orientation : undefined
      };
    }

    if (!targetPoint) {
      targetPoint = {
        pos: [
          // this.type === 'endpoint' ? this.targetEndpoint._posLeft + this.targetEndpoint._width / 2 : this.targetNode.left + this.targetNode.dom.offsetWidth / 2,
          // this.type === 'endpoint' ? this.targetEndpoint._posTop + this.targetEndpoint._height / 2 : this.targetNode.top + this.targetNode.dom.offsetHeight / 2
          this.type === 'endpoint' ? this.targetEndpoint._posLeft + this.targetEndpoint._width / 2 : this.targetNode.left + $(this.sourceNode.dom).width() / 2,
          this.type === 'endpoint' ? this.targetEndpoint._posTop + this.targetEndpoint._height / 2 : this.targetNode.top + $(this.sourceNode.dom).height() / 2
        ],
        orientation: (this.type === 'endpoint' && this.targetEndpoint.orientation) ? this.targetEndpoint.orientation : undefined
      };
    }
    let path = '';
    if (this.calcPath) {
      path = this.calcPath(sourcePoint, targetPoint);
    } else if (this.shapeType === 'Bezier') {
      path = DrawUtil.drawBezier(sourcePoint, targetPoint);
    } else if (this.shapeType === 'Straight') {
      path = DrawUtil.drawStraight(sourcePoint, targetPoint);
    } else if (this.shapeType === 'Flow') {
      path = DrawUtil.drawFlow(sourcePoint, targetPoint, this.orientationLimit);
    }
    return path;
  }
  redrawLabel() {
    let pathLength = this.dom.getTotalLength() / 2;
    let centerPoint = this.dom.getPointAtLength(pathLength);
    $(this.labelDom)
      .css('left', centerPoint.x - this.labelDom.offsetWidth / 2)
      .css('top', centerPoint.y - this.labelDom.offsetHeight / 2);
  }
  drawLabel(label) {
    let isDom = typeof HTMLElement === 'object' ? (obj) => {
      return obj instanceof HTMLElement;
    } : (obj) => {
      return obj && typeof obj === 'object' && obj.nodeType === 1 && typeof obj.nodeName === 'string';
    };
    if (label) {
      if (isDom(label)) {
        return label;
      } else {
        let dom = document.createElement('span');
        dom.className = 'butterflies-label';
        dom.innerText = label;
        return dom;
      }
    }
  }
  redrawArrow(path) {
    let point = this.dom.getPointAtLength(this.dom.getTotalLength() * this.arrowPosition);
    let x = point.x;
    let y = point.y;

    let vector = ArrowUtil.calcSlope({
      shapeType: this.shapeType,
      dom: this.dom,
      arrowPosition: this.arrowPosition,
      path: path
    });
    let deg = Math.atan2(vector.y, vector.x) / Math.PI * 180;

    this.arrowDom.setAttribute('d', ArrowUtil.arrow.default);
    this.arrowDom.setAttribute('transform', `rotate(${deg}, ${x}, ${y})translate(${x}, ${y})`);
  }
  drawArrow(arrow) {
    if (arrow) {
      let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'butterflies-arrow');
      return path;
    }
  }
  redraw(sourcePoint, targetPoint, options) {
    // 重新计算线条path
    let path = this._calcPath(sourcePoint, targetPoint);
    this.dom.setAttribute('d', path);
    if (this.isExpandWidth) {
      this.eventHandlerDom.setAttribute('d', path);
      $(this.eventHandlerDom).insertAfter(this.dom);
    }
    // 重新计算label
    if (this.labelDom) {
      this.redrawLabel();
    }
    // 重新计算arrow
    if (this.arrowDom) {
      this.redrawArrow(path);
    }

    this.updated && this.updated();
  }
  destroy(isNotEventEmit) {
    if (this.labelDom) {
      $(this.labelDom).remove();
    }
    if (this.arrowDom) {
      $(this.arrowDom).remove();
    }
    if (this.eventHandlerDom) {
      $(this.eventHandlerDom).remove();
    }
    $(this.dom).remove();
    if (this.id && !isNotEventEmit) {
      this._emit('system.link.delete', {
        link: this
      });
      this._emit('events', {
        type: 'link:delete',
        link: this
      });
    }
  }
  _create(opts) {
    this.id = _.get(opts, 'id') || this.id;
    this.targetNode = _.get(opts, 'targetNode') || this.targetNode;
    this._targetType = _.get(opts, '_targetType') || this._targetType;
    this.targetEndpoint = _.get(opts, 'targetEndpoint') || this.targetEndpoint;
    this.sourceNode = _.get(opts, 'sourceNode') || this.sourceNode;
    this._sourceType = _.get(opts, '_sourceType') || this._sourceType;
    this.sourceEndpoint = _.get(opts, 'sourceEndpoint') || this.sourceEndpoint;
    this.type = _.get(opts, 'type') || this.type;
    this._isDeletingEdge = false;
    this.redraw();
  }
}

module.exports = Edge;
